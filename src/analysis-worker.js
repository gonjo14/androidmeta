(() => {
'use strict';
const { MAX_FILE_BYTES, FILE_LIMIT_LABEL, MAX_LINES, MAX_ARCHIVE_ENTRIES } = AnalysisConfig;
let archive = null, activeFile = null, activeTool = '', logData = null, logFindings = null, report = null;
let lastProgress = 0;
function progress(message, force = false) {
  if (force || Date.now() - lastProgress > 120) { postMessage({ type: 'progress', message }); lastProgress = Date.now(); }
}
function requireReady() { if (!logData || !report) throw new Error('Choose a file and finish analysis first.'); }

async function extractEntry(entry) {
  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder('utf-8'), chunks = [];
    let size = 0, failed = false;
    const stream = entry.internalStream('uint8array');
    stream.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_FILE_BYTES) { failed = true; stream.pause(); reject(new Error(`The extracted file exceeds the ${FILE_LIMIT_LABEL} limit. Choose a smaller capture.`)); return; }
      chunks.push(decoder.decode(chunk, { stream: true }));
      progress(`Extracting ${entry.name} · ${(size / 1048576).toFixed(1)} MiB`);
    });
    stream.on('error', error => { failed = true; reject(error); });
    stream.on('end', () => { if (!failed) { chunks.push(decoder.decode()); resolve(chunks.join('')); } });
    stream.resume();
  });
}

async function inspectFile(file, tool) {
  const validationError = validateCapture(file, tool);
  if (validationError) throw new Error(validationError);
  if (!['bugreport', 'logcat', 'packages'].includes(tool)) throw new Error('Choose a supported analyser.');
  if (typeof file.text !== 'function' || typeof file.arrayBuffer !== 'function') throw new Error('Choose a readable file from your device.');
  activeFile = file; activeTool = tool; archive = null; logData = null; report = null;
  progress('Reading your file…', true);
  if (/\.zip$/i.test(file.name)) {
    const buffer = await readCapture(file, 'arrayBuffer');
    try { archive = await JSZip.loadAsync(buffer); }
    catch (_) { throw new Error('Could not open this ZIP. It may be damaged, encrypted, or use an unsupported compression method.'); }
    const entries = Object.values(archive.files).filter(e => !e.dir && !e.name.startsWith('__MACOSX/') && /\.(txt|log)$/i.test(e.name));
    if (!entries.length) throw new Error('No .txt or .log files were found inside this ZIP.');
    if (entries.length > MAX_ARCHIVE_ENTRIES) throw new Error(`This ZIP contains more than ${MAX_ARCHIVE_ENTRIES.toLocaleString('en-US')} text files. Extract the report you need and open it directly.`);
    entries.sort((a, b) => Number(/(?:bugreport|logcat)[^/]*\.(txt|log)$/i.test(b.name)) - Number(/(?:bugreport|logcat)[^/]*\.(txt|log)$/i.test(a.name)) || a.name.localeCompare(b.name));
    if (entries.length > 1) { postMessage({ type: 'archive', entries: entries.map(e => e.name) }); return; }
    await chooseEntry(entries[0].name);
  } else {
    await runAnalysis(await readCapture(file, 'text'), file.name);
  }
}

async function readCapture(file, method) {
  try { return await file[method](); }
  catch (cause) {
    throw new Error('This file could not be read from disk. If it lives on a cloud-synced or network drive, make it available offline and try again.', { cause });
  }
}

async function chooseEntry(name) {
  const entry = archive?.file(name);
  if (!entry || !/\.(txt|log)$/i.test(name)) throw new Error('Choose a text or log file from the archive.');
  progress('Extracting the selected report…', true);
  const text = await extractEntry(entry);
  const source = `${activeFile.name} / ${entry.name}`;
  archive = null;
  await runAnalysis(text, source);
}

async function runAnalysis(text, source) {
  if (!text.trim()) throw new Error('The selected file has no text to analyse.');
  if (activeTool === 'packages') {
    progress('Reading package inventory…', true);
    report = PackageAnalysis.analyse(text, source, progress);
    postMessage({ type: 'result', summary: report });
    return;
  }
  const sample = text.slice(0, 16000);
  if ((sample.match(/\0/g) || []).length > 5) throw new Error('This does not look like UTF-8 text. Export the capture as UTF-8 .txt and try again.');
  let lineCount = 1;
  // A final newline terminates the last line; it does not add a source line.
  for (let i = 0; i < text.length - 1; i++) {
    if (text.charCodeAt(i) === 10 && ++lineCount > MAX_LINES) {
      throw new Error(`This capture exceeds ${MAX_LINES.toLocaleString('en-US')} lines. Split it into smaller files and analyse each part.`);
    }
  }
  progress('Parsing log records…', true);
  logData = Logcat.parse(text, progress);
  if (activeTool === 'logcat' && !logData.parsed) throw new Error('No supported logcat records were found. Use threadtime, time, brief, or long format; raw message-only logs have no priority or process fields.');
  progress('Grouping crash markers and recurring errors…', true);
  logFindings = Logcat.signals(logData);
  if (activeTool === 'logcat') {
    report = Logcat.summary(logData, source, logFindings);
  } else {
    progress('Analysing crashes, battery statistics, and package access…', true);
    report = Bugreport.details(text, Bugreport.analyze(text, source, logData, logFindings), logData);
  }
  postMessage({ type: 'result', summary: report });
}

function query(filters, page, requestId) {
  requireReady();
  postMessage({ type: 'query', requestId, ...LogQuery.selectPage(logData.records, filters, page) });
}

function context(line, requestId) {
  requireReady();
  const { CONTEXT_BEFORE, CONTEXT_AFTER, CONTEXT_LINE_CHARS } = AnalysisConfig;
  const target = Math.max(1, Math.min(logData.lines.length, Math.floor(Number(line)) || 1));
  const start = Math.max(1, target - CONTEXT_BEFORE), end = Math.min(logData.lines.length, target + CONTEXT_AFTER);
  const lines = logData.lines.slice(start - 1, end).map((text, i) => ({ line: start + i, text: text.slice(0, CONTEXT_LINE_CHARS), shortened: text.length > CONTEXT_LINE_CHARS }));
  postMessage({ type: 'context', requestId, target, start, end, total: logData.lines.length, lines });
}

function exportLog(filters) {
  requireReady();
  const parts = [];
  let count = 0, lastBuffer = null;
  for (const r of logData.records) {
    if (!Logcat.matches(r, filters)) continue;
    if (r.buffer !== lastBuffer && r.buffer !== 'unspecified') { parts.push(`--------- beginning of ${r.buffer}\n`); lastBuffer = r.buffer; }
    parts.push(logData.lines.slice(r.line - 1, r.endLine).join('\n') + '\n'); count++;
  }
  postMessage({ type: 'export', blob: new Blob(parts, { type: 'text/plain;charset=utf-8' }), count });
}

self.onmessage = async ({ data }) => {
  if (!data || typeof data !== 'object') data = {};
  try {
    switch (data.type) {
      case 'open': await inspectFile(data.file, data.tool); break;
      case 'entry': await chooseEntry(data.name); break;
      case 'query': query(data.filters, data.page, data.requestId); break;
      case 'context': context(data.line, data.requestId); break;
      case 'export': exportLog(data.filters); break;
      default: throw new Error('Unknown analysis request.');
    }
  } catch (error) {
    postMessage({ type: 'error', operation: data.type, requestId: data.requestId, message: error?.message || 'The file could not be analysed.' });
  }
};
})();

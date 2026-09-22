const Logcat = (() => {
  const stamp = String.raw`((?:\d{4}-)?\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:\s*[+-]\d{4})?|\d{9,}\.\d+)`;
  const thread = new RegExp(`^${stamp}\\s+(?:(\\S+)\\s+)?(\\d+)\\s+(\\d+)\\s+([VDIWEFA])\\s+(.+?):\\s?(.*)$`);
  const timed = new RegExp(`^${stamp}\\s+([VDIWEFA])\\/([^(:]+)\\(\\s*(\\d+)\\):\\s?(.*)$`);
  const brief = /^([VDIWEFA])\/([^(:]+)\(\s*(\d+)\):\s?(.*)$/;
  const long = new RegExp(`^\\[\\s*${stamp}\\s+(\\d+):\\s*(\\d+)\\s+([VDIWEFA])\\/(.+?)\\s*\\]$`);
  const ranks = { '?': 0, V: 1, D: 2, I: 3, W: 4, E: 5, F: 6, A: 6 };
  const labels = { native: 'Native crash', java: 'Java crash', anr: 'ANR', memory: 'Memory pressure', exception: 'Exception', denial: 'SELinux denial', network: 'Network failure', jank: 'Skipped frames' };
  const actions = {
    native: 'Review the signal and process, then inspect the tombstone or abort message at the same time.',
    java: 'Start with the deepest “Caused by” exception and the first application stack frame.',
    anr: 'Inspect the main-thread trace and the ANR reason. Check for blocked I/O, locks, or long-running work.',
    memory: 'Check the affected process and memory pressure near this entry. A process kill is not automatically an app crash.',
    exception: 'Review the exception and nearby entries. Logged or handled exceptions are not automatically crashes.',
    denial: 'Check the denied operation and SELinux source/target contexts. A policy denial alone is not evidence of compromise.',
    network: 'Correlate with connectivity, DNS, TLS, or timeout events for the same process.',
    jank: 'Check main-thread work near this entry and reproduce with a performance trace.'
  };

  function parseLine(input) {
    const line = input.replace(/\x1b\[[0-9;]*m/g, '');
    let m = thread.exec(line);
    if (m) return { timestamp: m[1], uid: m[2] || '', pid: m[3], tid: m[4], level: m[5], tag: m[6].trim(), message: m[7], format: 'threadtime' };
    m = timed.exec(line);
    if (m) return { timestamp: m[1], pid: m[4], tid: '', level: m[2], tag: m[3].trim(), message: m[5], format: 'time' };
    m = brief.exec(line);
    if (m) return { timestamp: '', pid: m[3], tid: '', level: m[1], tag: m[2].trim(), message: m[4], format: 'brief' };
    m = long.exec(line);
    if (m) return { timestamp: m[1], pid: m[2], tid: m[3], level: m[4], tag: m[5].trim(), message: '', format: 'long' };
    return null;
  }

  function parse(text, progress = () => {}) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    if (lines[lines.length - 1] === '') lines.pop();
    const records = [], levels = { V: 0, D: 0, I: 0, W: 0, E: 0, F: 0, A: 0 }, buffers = new Map(), tags = new Map(), formats = new Set();
    let buffer = 'unspecified', previous = null, parsed = 0, continuationLines = 0, unparsed = 0, banners = 0, blank = 0;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (i % 30000 === 0) progress(`Reading log entries · ${Math.round(i / Math.max(lines.length, 1) * 100)}%`);
      const marker = /^-+\s+(?:beginning of|switch to)\s+([\w-]+)/.exec(raw);
      if (marker) { buffer = marker[1]; previous = null; banners++; continue; }
      if (!raw.trim()) { blank++; if (previous?.format === 'long') previous = null; continue; }
      const record = parseLine(raw);
      if (record) {
        Object.assign(record, { id: records.length, line: i + 1, endLine: i + 1, buffer, signals: [] });
        records.push(record); previous = record; parsed++;
        levels[record.level]++;
        buffers.set(buffer, (buffers.get(buffer) || 0) + 1);
        tags.set(record.tag, (tags.get(record.tag) || 0) + 1);
        formats.add(record.format);
      } else if (previous && (previous.format === 'long' || /^\s*(?:at\s+|Caused by:|Suppressed:|\.\.\. \d+ more|[\w.$]+(?:Exception|Error)(?::|$))/.test(raw))) {
        // Continuations remain attached to their entry; the source text is retained separately.
        if (previous.message.length < 64000) previous.message += (previous.message ? '\n' : '') + raw;
        previous.endLine = i + 1; continuationLines++;
      } else {
        records.push({ id: records.length, line: i + 1, endLine: i + 1, buffer, timestamp: '', pid: '', tid: '', level: '?', tag: '(unparsed)', message: raw, signals: [], format: 'unparsed' });
        previous = null; unparsed++;
      }
    }
    return { lines, records, parsed, continuationLines, unparsed, banners, blank, levels, buffers, tags, formats };
  }

  function normalized(message) {
    return message.replace(/0x[\da-f]+/gi, '<address>').replace(/\b(pid|tid)[=: ]+\d+/gi, '$1=<id>').replace(/\baudit\([\d.:]+\)/g, 'audit(<id>)').replace(/\s+/g, ' ').trim().slice(0, 700);
  }

  function javaDetail(records, index) {
    const first = records[index], collected = [first.message];
    let process = '', reason = '', endLine = first.endLine;
    const timestampNumber = value => {
      if (/^\d{9,}\.\d+$/.test(value)) return Number(value) * 1000;
      const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(value || '');
      return m ? Date.UTC(Number(m[1] || 2000), +m[2] - 1, +m[3], +m[4], +m[5], +m[6], Number((m[7] || '').padEnd(3, '0').slice(0, 3))) : NaN;
    };
    const startTime = timestampNumber(first.timestamp);
    for (let j = index + 1; j < Math.min(index + 180, records.length); j++) {
      const r = records[j];
      if (r.pid !== first.pid || !/^(AndroidRuntime|System\.err)$/.test(r.tag)) continue;
      const delta = timestampNumber(r.timestamp) - startTime;
      if (delta > 10000) break;
      if (delta < 0) continue;
      if (/FATAL EXCEPTION/.test(r.message)) break;
      collected.push(r.message); endLine = r.endLine;
      const p = /\bProcess:\s*([^,\s]+)/.exec(r.message);
      if (p) process = p[1];
      const e = /(?:Caused by:\s*)?([\w.$]+(?:Exception|Error)(?::[^\n]*)?)/.exec(r.message);
      if (e && (!reason || /Caused by:/.test(r.message))) reason = e[1];
      if (collected.length >= 60) break;
    }
    const joined = collected.join('\n');
    process ||= /\bProcess:\s*([^,\s]+)/.exec(joined)?.[1] || `PID ${first.pid || 'unknown'}`;
    reason = [...joined.matchAll(/Caused by:\s*([^\n]+)/g)].pop()?.[1] || reason
      || /([\w.$]+(?:Exception|Error):[^\n]*)/.exec(joined)?.[1] || first.message;
    return { process, summary: reason.slice(0, 600), detail: joined.slice(0, 16000), endLine };
  }

  function signals(data) {
    const groups = new Map(), repeated = new Map(), counts = Object.fromEntries(Object.keys(labels).map(k => [k, 0]));
    const javaCrashes = [], anrs = [], nativeCrashes = [], seenCrashes = new Map();
    for (let i = 0; i < data.records.length; i++) {
      const r = data.records[i];
      if (r.level === '?') continue;
      const msg = r.message;
      let kind = '', title = '', process = r.tag, detail = msg, candidate = null;
      if (/\bFATAL EXCEPTION\s*:/.test(msg)) {
        kind = 'java'; const crash = javaDetail(data.records, i);
        process = crash.process; title = crash.summary; detail = crash.detail;
        candidate = { ...crash, line: r.line, pid: r.pid, timestamp: r.timestamp };
      } else if (/\bFatal signal\s+\d+\s*\(SIG[A-Z0-9]+\)/.test(msg)) {
        kind = 'native'; title = msg;
        process = /\bpid\s+\d+\s*\(([^)]+)\)/.exec(msg)?.[1] || /\btid\s+\d+\s*\(([^)]+)\)/.exec(msg)?.[1] || `PID ${r.pid}`;
        candidate = { pid: /\bpid\s+(\d+)/.exec(msg)?.[1] || r.pid, signal: /\((SIG[A-Z0-9]+)\)/.exec(msg)?.[1] || '', cmdline: process, timestamp: r.timestamp, line: r.line, detail: msg };
      } else if (/\bANR in\s+/.test(msg) || r.tag === 'am_anr') {
        kind = 'anr'; process = /\bANR in\s+([^\s(]+)/.exec(msg)?.[1] || /^\[\s*\d+\s*,\s*\d+\s*,\s*([^,\]]+)/.exec(msg)?.[1]?.trim() || r.tag;
        title = msg; candidate = { process, line: r.line, detail: msg, timestamp: r.timestamp };
      } else if (/\bOutOfMemoryError\b|\bOut of memory\b|\bLow on memory\b|\blowmemorykiller\b.*\bkill(?:ing|ed)\b|\bKill(?:ing)?\s+['"]?[^\n]+\bto free\b/i.test(msg)) {
        kind = 'memory'; title = msg;
      } else if (/\bavc:\s*denied\b/i.test(msg)) {
        kind = 'denial'; title = msg;
      } else if (/\bSkipped\s+\d+\s+frames!/.test(msg)) {
        kind = 'jank'; title = msg;
      } else if (/\b(?:UnknownHostException|SocketTimeoutException|SSLHandshakeException|ConnectException)\b|\b(?:ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH)\b/.test(msg)) {
        kind = 'network'; title = msg;
      } else if (/\b(?:Caused by:\s*|[\w.$]+(?:Exception|Error):)/.test(msg) && ranks[r.level] >= 4) {
        kind = 'exception'; title = msg;
      }
      if (kind) {
        const crashKey = ['java', 'native', 'anr'].includes(kind) && r.timestamp ? `${kind}|${r.timestamp}|${r.pid}|${msg}` : '';
        r.signals.push(kind);
        if (!crashKey || !seenCrashes.has(crashKey)) {
          if (crashKey) seenCrashes.set(crashKey, r.line);
          if (kind === 'java') javaCrashes.push(candidate);
          if (kind === 'native') nativeCrashes.push(candidate);
          if (kind === 'anr') anrs.push(candidate);
          counts[kind]++;
          const key = `${kind}|${process}|${normalized(title)}`;
          let group = groups.get(key);
          if (!group) {
            group = { id: groups.size, kind, label: labels[kind], process, title: title.slice(0, 900), detail: detail.slice(0, 16000), count: 0, line: r.line, lastLine: r.line, timestamp: r.timestamp, lastTimestamp: r.timestamp, samples: [], action: actions[kind] };
            groups.set(key, group);
          }
          group.count++; group.lastLine = r.line; group.lastTimestamp = r.timestamp;
          if (group.samples.length < 20) group.samples.push(r.line);
        }
      }
      if (ranks[r.level] >= 4) {
        const key = `${r.level}|${r.tag}|${normalized(msg)}`;
        let group = repeated.get(key);
        if (!group) { group = { level: r.level, tag: r.tag, message: msg.slice(0, 900), count: 0, line: r.line }; repeated.set(key, group); }
        group.count++;
      }
    }
    const priority = { native: 0, java: 0, anr: 1, memory: 2, exception: 3, network: 4, denial: 5, jank: 6 };
    const findings = [...groups.values()].sort((a, b) => priority[a.kind] - priority[b.kind] || b.count - a.count || a.line - b.line);
    return { counts, findings, repeated: [...repeated.values()].sort((a, b) => b.count - a.count), javaCrashes, nativeCrashes, anrs };
  }

  function summary(data, source, findings) {
    let firstTimestamp = '', lastTimestamp = '', hasYearlessTimestamp = false;
    for (const record of data.records) {
      if (!record.timestamp) continue;
      firstTimestamp ||= record.timestamp;
      lastTimestamp = record.timestamp;
      hasYearlessTimestamp ||= /^\d{2}-\d{2}/.test(record.timestamp);
    }
    const notes = [];
    if (hasYearlessTimestamp) notes.push('Some timestamps have no year or time zone. They are shown as recorded; no year is inferred.');
    if (data.buffers.size > 1) notes.push('Multiple buffers are present. File order may differ from chronological order; older crash-buffer entries can precede recent activity.');
    if (data.unparsed) notes.push(`${data.unparsed.toLocaleString('en-US')} lines were not recognised as logcat. They remain available under “Unparsed” in the explorer.`);
    notes.push('Counts describe this file only. Fatal-priority records and handled exceptions do not each represent a separate crash.');
    return {
      tool: 'logcat', version: 2, source_file: source, analyzed_at: new Date().toISOString(),
      physical_lines: data.lines.length, parsed_records: data.parsed, unparsed_lines: data.unparsed, continuation_lines: data.continuationLines,
      buffer_markers: data.banners, blank_lines: data.blank, formats: [...data.formats], levels: data.levels,
      buffers: [...data.buffers].sort((a, b) => b[1] - a[1]), tags: [...data.tags].sort((a, b) => b[1] - a[1]),
      first_recorded_timestamp: firstTimestamp, last_recorded_timestamp: lastTimestamp,
      counts: findings.counts, finding_groups: findings.findings.length, findings: findings.findings.slice(0, 200),
      repeated_groups: findings.repeated.length, repeated: findings.repeated.slice(0, 100), notes,
      limits: { exported_finding_groups: 200, exported_repeated_groups: 100, examples_per_group: 20 }
    };
  }

  function matches(r, filters = {}) {
    if (filters.level === '?' && r.level !== '?') return false;
    if (filters.level && filters.level !== '?' && ranks[r.level] < ranks[filters.level]) return false;
    if (filters.buffer && r.buffer !== filters.buffer) return false;
    if (filters.pid && r.pid !== filters.pid.trim()) return false;
    if (filters.tag && !r.tag.toLowerCase().includes(filters.tag.toLowerCase())) return false;
    if (filters.signal && !r.signals.includes(filters.signal)) return false;
    if (filters.query) {
      const haystack = `${r.timestamp} ${r.tag} ${r.pid} ${r.tid} ${r.message}`.toLowerCase();
      if (!haystack.includes(filters.query.toLowerCase())) return false;
    }
    return true;
  }

  return { parseLine, parse, signals, summary, matches, ranks, labels, javaDetail };
})();

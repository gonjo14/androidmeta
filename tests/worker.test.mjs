import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadAnalysis, logLine } from './helpers.mjs';

test('rejects oversized captures before any read, with the same limit as the UI', async () => {
  const api = loadAnalysis({ worker: true });
  let reads = 0;
  const file = {
    name: 'large.log', size: api.AnalysisConfig.MAX_FILE_BYTES + 1,
    text: async () => { reads++; }, arrayBuffer: async () => { reads++; },
  };
  const messages = await api.send({ type: 'open', file, tool: 'logcat' });
  assert.equal(reads, 0);
  assert.equal(messages.at(-1).type, 'error');
  assert.match(messages.at(-1).message, /150 MiB/);
  assert.equal(api.validateCapture({ name: 'at-limit.txt', size: api.AnalysisConfig.MAX_FILE_BYTES }), null);
});

test('empty, unsupported, and invalid captures fail metadata validation', () => {
  const { validateCapture } = loadAnalysis();
  assert.match(validateCapture({ name: 'empty.txt', size: 0 }), /empty/);
  assert.match(validateCapture({ name: 'photo.png', size: 1 }), /\.txt/);
  assert.match(validateCapture({ name: 'capture.log', size: NaN }), /valid/);
  assert.equal(validateCapture({ name: 'CAPTURE.LOG', size: 1 }), null);
});

test('worker reads a File object and returns a logcat summary', async () => {
  const api = loadAnalysis({ worker: true });
  const file = new File([logLine('hello')], 'capture.log');
  const messages = await api.send({ type: 'open', file, tool: 'logcat' });
  const result = messages.find(message => message.type === 'result');
  assert.equal(result?.summary.parsed_records, 1);
  assert.equal(result.summary.source_file, 'capture.log');
});

test('worker reports read failures without leaving a result', async () => {
  const api = loadAnalysis({ worker: true });
  const file = { name: 'offline.txt', size: 1, text: async () => { throw new Error('unavailable'); }, arrayBuffer: async () => new ArrayBuffer(0) };
  const messages = await api.send({ type: 'open', file, tool: 'logcat' });
  assert.equal(messages.at(-1).operation, 'open');
  assert.match(messages.at(-1).message, /could not be read from disk/);
  assert.ok(!messages.some(message => message.type === 'result'));
});

test('context success and errors echo request IDs', async () => {
  const api = loadAnalysis({ worker: true });
  let messages = await api.send({ type: 'context', line: 1, requestId: 10 });
  assert.equal(messages.at(-1).type, 'error');
  assert.equal(messages.at(-1).requestId, 10);
  await api.send({ type: 'open', file: new File([logLine('evidence')], 'capture.txt'), tool: 'logcat' });
  messages = await api.send({ type: 'context', line: 1, requestId: 11 });
  assert.equal(messages.at(-1).type, 'context');
  assert.equal(messages.at(-1).requestId, 11);
  assert.equal(messages.at(-1).target, 1);
  assert.equal(messages.at(-1).lines[0].text, logLine('evidence'));
});

test('line limit allows a final newline and rejects one more physical line', async () => {
  const api = loadAnalysis({ worker: true, limits: { MAX_LINES: 2 } });
  let messages = await api.send({ type: 'open', file: new File([`${logLine('first')}\n${logLine('second')}\n`], 'capture.log'), tool: 'logcat' });
  assert.equal(messages.at(-1).type, 'result');
  assert.equal(messages.at(-1).summary.physical_lines, 2);
  messages = await api.send({ type: 'open', file: new File([`${logLine('first')}\n${logLine('second')}\n${logLine('third')}`], 'capture.log'), tool: 'logcat' });
  assert.equal(messages.at(-1).type, 'error');
  assert.match(messages.at(-1).message, /exceeds 2 lines/);
});

test('ZIP selection preserves entry name, summary, and source context', async () => {
  const api = loadAnalysis({ worker: true });
  const zip = vm.runInContext('new JSZip()', api.scope);
  zip.file('logcat.txt', logLine('from archive'));
  zip.file('notes.txt', 'plain notes');
  const buffer = await zip.generateAsync({ type: 'uint8array' });
  let messages = await api.send({ type: 'open', file: new File([buffer], 'capture.zip'), tool: 'logcat' });
  assert.equal(messages.at(-1).type, 'archive');
  assert.deepEqual(Array.from(messages.at(-1).entries), ['logcat.txt', 'notes.txt']);
  messages = await api.send({ type: 'entry', name: 'logcat.txt' });
  assert.equal(messages.at(-1).type, 'result');
  assert.equal(messages.at(-1).summary.source_file, 'capture.zip / logcat.txt');
  messages = await api.send({ type: 'context', line: 1, requestId: 20 });
  assert.match(messages.at(-1).lines[0].text, /from archive/);
});

test('ZIP decompression enforces the extracted byte limit', async () => {
  const api = loadAnalysis({ worker: true, limits: { MAX_FILE_BYTES: 1024 } });
  const zip = vm.runInContext('new JSZip()', api.scope);
  zip.file('large.log', 'x'.repeat(8192));
  const buffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  assert.ok(buffer.byteLength < 1024);
  const messages = await api.send({ type: 'open', file: new File([buffer], 'small.zip'), tool: 'logcat' });
  assert.equal(messages.at(-1).type, 'error');
  assert.match(messages.at(-1).message, /extracted file exceeds/);
});

test('filtered export preserves the original source lines', async () => {
  const api = loadAnalysis({ worker: true });
  const text = `--------- beginning of main\n${logLine('keep this', { level: 'E' })}\n${logLine('skip this', { level: 'I' })}\n`;
  await api.send({ type: 'open', file: new File([text], 'capture.log'), tool: 'logcat' });
  const messages = await api.send({ type: 'export', filters: { level: 'E' } });
  assert.equal(messages.at(-1).count, 1);
  assert.equal(await messages.at(-1).blob.text(), `--------- beginning of main\n${logLine('keep this', { level: 'E' })}\n`);
});

test('invalid worker messages return an error without throwing', async () => {
  const api = loadAnalysis({ worker: true });
  const messages = await api.send(null);
  assert.equal(messages.at(-1).type, 'error');
  assert.match(messages.at(-1).message, /Unknown analysis request/);
});

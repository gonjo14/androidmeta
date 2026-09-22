import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadAnalysis, logLine, read } from './helpers.mjs';

// A small DOM/Worker double exercises lifecycle behaviour. It does not replace
// browser layout, accessibility, or structured-clone integration testing.
function loadUI() {
  const elements = new Map();
  const listeners = new Map();
  const timers = new Map();
  const workers = [];
  let nextTimer = 0;
  class Element {
    constructor(id, tagName = 'DIV') {
      Object.assign(this, { id, tagName, hidden: true, open: false, checked: false, value: '', textContent: '', events: new Map(), classList: { toggle() {}, add() {}, remove() {} } });
    }
    set innerHTML(value) {
      this.html = value;
      for (const match of value.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"/gi)) {
        elements.set(match[2], new Element(match[2], match[1].toUpperCase()));
      }
    }
    get innerHTML() { return this.html || ''; }
    addEventListener(type, handler) { this.events.set(type, handler); }
    setAttribute() {}
    removeAttribute() {}
    focus() {}
    replaceChildren() { this.html = ''; }
    querySelector() { return null; }
    showModal() { this.open = true; }
    close() { this.open = false; this.events.get('close')?.(); }
  }
  for (const id of ['home', 'bugreport', 'logcat', 'main', 'breadcrumb', 'toast', 'analysis-worker', 'context-dialog', 'context-title', 'context-meta', 'context-content', 'context-before', 'context-after', 'history-open', 'history-clear']) {
    elements.set(id, new Element(id));
  }
  class MockWorker {
    constructor() { this.sent = []; this.terminated = false; workers.push(this); }
    postMessage(message) { this.sent.push(message); }
    terminate() { this.terminated = true; }
    reply(data) { this.onmessage({ data }); }
  }
  const document = {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: selector => selector === '.page' ? ['home', 'bugreport', 'logcat'].map(id => elements.get(id)) : [],
    querySelector: () => null,
    addEventListener: (type, handler) => listeners.set(type, handler),
  };
  const scope = vm.createContext({
    document, Worker: MockWorker, Blob, File, Option: class {},
    URL: { createObjectURL: () => 'blob:test-worker', revokeObjectURL() {} },
    location: { hash: '#home' }, history: { replaceState() {} },
    localStorage: { getItem: () => null },
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
    window: { Worker: MockWorker, addEventListener() {} },
  });
  vm.runInContext(read('src/config.js'), scope);
  vm.runInContext(read('src/app.js'), scope);
  const file = new File([logLine('evidence')], 'capture.log');
  const analysis = loadAnalysis();
  const parsed = analysis.Logcat.parse(logLine('evidence'));
  const summary = analysis.Logcat.summary(parsed, 'capture.log', analysis.Logcat.signals(parsed));
  const changeFile = selected => elements.get('logcat-file').events.get('change')({ target: { files: [selected], value: '' } });
  const click = dataset => listeners.get('click')({ target: { closest: () => ({ dataset, disabled: false }) } });
  const open = () => {
    changeFile(file);
    workers.at(-1).reply({ type: 'result', summary });
    return workers.at(-1);
  };
  return { elements, workers, timers, changeFile, click, open, summary };
}

test('UI rejects an oversized file before creating a worker or reading bytes', () => {
  const ui = loadUI();
  let reads = 0;
  ui.changeFile({ name: 'large.log', size: 151 * 1024 * 1024, arrayBuffer() { reads++; }, text() { reads++; } });
  assert.equal(reads, 0);
  assert.equal(ui.workers.length, 0);
  assert.match(ui.elements.get('logcat-error').textContent, /150 MiB/);
});

test('UI ignores old context responses and old context errors', () => {
  const ui = loadUI();
  const worker = ui.open();
  ui.click({ context: '1', tool: 'logcat' });
  ui.click({ context: '2', tool: 'logcat' });
  const [first, second] = worker.sent.filter(message => message.type === 'context');
  assert.ok(second.requestId > first.requestId);
  const response = (request, text) => ({ type: 'context', requestId: request.requestId, target: request.line, start: 1, end: 2, total: 2, lines: [{ line: request.line, text }] });
  worker.reply(response(second, 'new evidence'));
  worker.reply(response(first, 'old evidence'));
  worker.reply({ type: 'error', operation: 'context', requestId: first.requestId, message: 'old error' });
  assert.match(ui.elements.get('context-content').innerHTML, /new evidence/);
  assert.doesNotMatch(ui.elements.get('context-content').innerHTML, /old evidence/);
  assert.equal(ui.elements.get('logcat-error').hidden, true);
  ui.elements.get('context-dialog').close();
  worker.reply(response(second, 'reply after close'));
  assert.doesNotMatch(ui.elements.get('context-content').innerHTML, /reply after close/);
});

test('UI reset terminates the worker, clears the debounce, and rejects late messages', () => {
  const ui = loadUI();
  const worker = ui.open();
  ui.click({ tab: 'explorer', tool: 'logcat' });
  const input = ui.elements.get('log-query');
  input.value = 'new filter';
  input.events.get('input')();
  assert.equal(ui.elements.get('log-prev').disabled, true);
  assert.equal(ui.elements.get('log-next').disabled, true);
  const timersBefore = ui.timers.size;
  ui.click({ cancel: 'logcat' });
  assert.equal(worker.terminated, true);
  // The cancellation toast replaces the previous toast timer. Only the
  // scheduled query timer disappears.
  assert.equal(ui.timers.size, timersBefore - 1);
  worker.reply({ type: 'result', summary: ui.summary });
  assert.equal(ui.elements.get('logcat-results').hidden, true);
});

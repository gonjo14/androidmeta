import vm from 'node:vm';
import { readFileSync } from 'node:fs';

export const root = new URL('../', import.meta.url);
export const read = name => readFileSync(new URL(name, root), 'utf8');

export function loadAnalysis({ worker = false, limits = {} } = {}) {
  const messages = [];
  const scope = vm.createContext({
    TextDecoder, TextEncoder, Blob, File, Uint8Array, ArrayBuffer,
    setTimeout, clearTimeout, setImmediate, console,
    postMessage: message => messages.push(message),
  });
  scope.self = scope;
  const files = ['src/config.js', 'src/logcat.js', 'src/log-query.js', 'src/bugreport-analysis.js'];
  if (worker) files.unshift('vendor/jszip-3.10.1.min.js');
  for (const name of files) {
    let source = read(name);
    // Smaller limits make boundary tests cheap; production values are immutable.
    if (name === 'src/config.js') {
      for (const [key, value] of Object.entries(limits)) {
        source = source.replace(new RegExp(`${key}: [^,]+,`), `${key}: ${value},`);
      }
    }
    vm.runInContext(source, scope, { filename: name });
  }
  if (worker) vm.runInContext(read('src/analysis-worker.js'), scope, { filename: 'src/analysis-worker.js' });
  const api = vm.runInContext('({ AnalysisConfig, validateCapture, Logcat, LogQuery, Bugreport })', scope);
  return { ...api, scope, messages, send: async data => {
    messages.length = 0;
    await scope.onmessage({ data });
    return messages;
  }};
}

export const logLine = (message, { pid = 123, tag = 'AndroidRuntime', level = 'E', time = '10:00:00.000' } = {}) =>
  `09-18 ${time} ${pid} ${pid} ${level} ${tag}: ${message}`;

export function report(api, text) {
  const parsed = api.Logcat.parse(text);
  const signals = api.Logcat.signals(parsed);
  return api.Bugreport.details(text, api.Bugreport.analyze(text, 'fixture.txt', parsed, signals), parsed);
}

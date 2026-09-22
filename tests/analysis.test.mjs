import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAnalysis, logLine, report } from './helpers.mjs';

test('recognises threadtime with UID/year, time, brief, and long formats', () => {
  const { Logcat } = loadAnalysis();
  const cases = [
    [logLine('hello'), 'threadtime', '123'],
    ['2026-09-18 10:00:00.001 +0000 u0_a123 123 456 W Tag: hello', 'threadtime', '123'],
    ['09-18 10:00:00.001 I/Tag( 123): hello', 'time', '123'],
    ['I/Tag( 123): hello', 'brief', '123'],
    ['[ 09-18 10:00:00.001 123: 456 I/Tag ]', 'long', '123'],
  ];
  for (const [line, format, pid] of cases) {
    const result = Logcat.parseLine(line);
    assert.equal(result?.format, format, line);
    assert.equal(result.pid, pid);
  }
  assert.equal(Logcat.parseLine('arbitrary text'), null);
});

test('Java crash lookup handles interleaved processes and deepest cause', () => {
  const api = loadAnalysis();
  const text = [
    logLine('FATAL EXCEPTION: main'),
    logLine('unrelated task', { pid: 999, tag: 'ActivityManager' }),
    logLine('Process: com.example.app, PID: 123'),
    logLine('java.lang.RuntimeException: outer'),
    logLine('Caused by: java.lang.IllegalStateException: inner'),
    logLine('    at com.example.Main.start(Main.kt:42)'),
  ].join('\n');
  const result = report(api, text);
  assert.equal(result.counts.java_crashes, 1);
  assert.equal(result.java_crashes[0].line, 1);
  assert.equal(result.java_crashes[0].process, 'com.example.app');
  assert.equal(result.java_crashes[0].summary, 'java.lang.IllegalStateException: inner');
  assert.doesNotMatch(result.java_crashes[0].detail, /unrelated task/);
});

test('mixed reports preserve physical source lines for raw crash and ANR evidence', () => {
  const api = loadAnalysis();
  const text = [
    '------ SYSTEM LOG ------',
    logLine('normal activity', { tag: 'ActivityManager', level: 'I' }),
    '',
    'FATAL EXCEPTION: main',
    'Process: com.example.raw, PID: 321',
    'java.lang.RuntimeException: outer',
    'Caused by: java.lang.IllegalArgumentException: missing key',
    '',
    'ANR in com.example.reader (com.example.reader/.Main)',
  ].join('\r\n');
  const result = report(api, text);
  assert.equal(result.java_crashes[0].line, 4);
  assert.equal(result.java_crashes[0].endLine, 7);
  assert.equal(result.java_crashes[0].process, 'com.example.raw');
  assert.equal(result.java_crashes[0].summary, 'java.lang.IllegalArgumentException: missing key');
  assert.equal(result.anrs[0].line, 9);
  assert.match(result.anrs[0].detail, /com\.example\.reader/);
});

test('raw crashes stay separate and do not absorb unrelated timestamped records', () => {
  const api = loadAnalysis();
  const result = report(api, [
    'FATAL EXCEPTION: main',
    'Process: com.example.first, PID: 1',
    'java.lang.Error: first',
    'FATAL EXCEPTION: main',
    'Process: com.example.second, PID: 2',
    'java.lang.Error: second',
    logLine('Process: com.unrelated.app, PID: 123'),
  ].join('\n'));
  assert.equal(result.counts.java_crashes, 2);
  assert.deepEqual(Array.from(result.java_crashes, crash => crash.line), [1, 4]);
  assert.doesNotMatch(result.java_crashes[1].detail, /com\.unrelated/);
});

test('long-format source span includes continuation lines', () => {
  const { Logcat } = loadAnalysis();
  const result = Logcat.parse('[ 09-18 10:00:00.001 123: 456 E/Tag ]\nfirst\nsecond\n\n');
  assert.equal(result.parsed, 1);
  assert.equal(result.records[0].line, 1);
  assert.equal(result.records[0].endLine, 3);
  assert.equal(result.records[0].message, 'first\nsecond');
});

test('routine native stack captures are not counted as fatal crashes', () => {
  const api = loadAnalysis();
  const result = report(api, 'pid: 123, tid: 123, name: app\nbacktrace:\n  #00 pc 1234 /system/lib/libc.so\n');
  assert.equal(result.counts.native_crashes, 0);
});

test('duplicate wakelock sections retain one coherent observation', () => {
  const api = loadAnalysis();
  const result = report(api, '------ BATTERY STATS ------\nDUMP OF SERVICE batterystats:\nTime on battery: 2h 0m 0s realtime\nKernel Wakelock wifi: 12m 0s (4 times) realtime\n');
  assert.equal(result.counts.wakelocks_reported, 1);
  assert.equal(result.wakelocks[0].seconds, 720);
  assert.equal(result.wakelocks[0].times, 4);
});

test('pagination matches the full filtered result and clamps stale page numbers', () => {
  const { Logcat, LogQuery } = loadAnalysis();
  const records = Logcat.parse(Array.from({ length: 713 }, (_, i) => logLine(`row ${i}`, { level: i % 3 ? 'I' : 'E' })).join('\n')).records;
  const filters = { level: 'E' };
  const expected = records.filter(row => row.level === 'E');
  for (const requested of [0, 1, 2, 99, -5, 1.9, Infinity]) {
    const result = LogQuery.selectPage(records, filters, requested);
    const page = Math.min(Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0, 2);
    assert.equal(result.total, expected.length);
    assert.equal(result.pages, 3);
    assert.equal(result.page, page);
    assert.deepEqual(Array.from(result.records, row => row.line), Array.from(expected.slice(page * 100, (page + 1) * 100), row => row.line));
  }
  const empty = LogQuery.selectPage(records, { query: 'nonexistent' }, 50);
  assert.equal(empty.total, 0);
  assert.equal(empty.page, 0);
  assert.equal(empty.pages, 1);
  assert.equal(empty.records.length, 0);
});

test('summary timestamps preserve file order without inferring a year', () => {
  const { Logcat } = loadAnalysis();
  const data = Logcat.parse([logLine('later', { time: '12:00:00.000' }), logLine('earlier', { time: '10:00:00.000' })].join('\n'));
  const result = Logcat.summary(data, 'sample.log', Logcat.signals(data));
  assert.equal(result.first_recorded_timestamp, '09-18 12:00:00.000');
  assert.equal(result.last_recorded_timestamp, '09-18 10:00:00.000');
  assert.ok(result.notes.some(note => note.includes('no year')));
});

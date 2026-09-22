// Optional integration checks. Requires Playwright and its Chromium browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const paths = [fileURLToPath(new URL('../', import.meta.url))];
if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) paths.push(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES);
const { chromium } = require(require.resolve('playwright', { paths }));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__workers = [];
    window.__contextRequests = [];
    window.__holdContext = false;
    window.Worker = class extends NativeWorker {
      constructor(...args) { super(...args); window.__workers.push(this); }
      postMessage(message, ...args) {
        if (message.type === 'context' && window.__holdContext) {
          window.__contextRequests.push(message);
          return;
        }
        super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(new URL('../dist/index.html', import.meta.url).href);
  // The user did not supply styles.css; these checks cover behaviour, not layout.
  await page.addStyleTag({ content: '.svg-defs { display:none; } svg { width:20px; height:20px; }' });
  await page.locator('.nav-item[data-route="logcat"]').click();
  await page.locator('[data-demo="logcat"]').click();
  await page.waitForFunction(() => !document.getElementById('logcat-results').hidden);
  assert.match(await page.locator('#logcat-results').innerText(), /2 crash markers and 1 ANR marker/);
  await page.locator('[data-tool="logcat"][data-tab="explorer"]').click();
  await page.waitForFunction(() => document.getElementById('log-count')?.textContent.includes('matching entries'));
  assert.equal(await page.locator('#log-rows tr').count(), 13);
  await page.locator('#log-query').fill('SocketTimeoutException');
  await page.waitForFunction(() => document.getElementById('log-count')?.textContent === '3 matching entries');
  assert.equal(await page.locator('#log-rows tr').count(), 3);
  console.log('PASS: real File → Blob worker → parser → filtered explorer, over file://');

  await page.evaluate(() => { window.__holdContext = true; });
  await page.locator('#log-rows [data-context]').first().click();
  // Simulate a second request before the first reply is delivered.
  await page.evaluate(() => document.querySelectorAll('#log-rows [data-context]')[1].click());
  const requests = await page.evaluate(() => window.__contextRequests);
  assert.equal(requests.length, 2);
  assert.ok(requests[1].requestId > requests[0].requestId);
  const deliver = (request, text) => page.evaluate(({ request, text }) => {
    window.__workers[0].onmessage({ data: {
      type: 'context', requestId: request.requestId, target: request.line,
      start: 1, end: 15, total: 15, lines: [{ line: request.line, text }],
    }});
  }, { request, text });
  await deliver(requests[1], 'latest evidence');
  await deliver(requests[0], 'stale evidence');
  assert.match(await page.locator('#context-content').innerText(), /latest evidence/);
  assert.doesNotMatch(await page.locator('#context-content').innerText(), /stale evidence/);
  await page.locator('[data-close="context-dialog"]').click();
  await deliver(requests[1], 'late reply after closing');
  assert.doesNotMatch(await page.locator('#context-content').innerText(), /late reply/);
  console.log('PASS: old context replies cannot overwrite the current or closed dialog');

  await page.locator('.nav-item[data-route="bugreport"]').click();
  await page.locator('[data-demo="bugreport"]').click();
  await page.waitForFunction(() => !document.getElementById('bugreport-results').hidden);
  assert.match(await page.locator('#bugreport-results').innerText(), /3 crash and ANR records/);
  await page.locator('[data-tool="bugreport"][data-tab="battery"]').click();
  assert.match(await page.locator('#bugreport-tab-content').innerText(), /12m 0s/);
  console.log('PASS: bugreport summary and battery view');

  const workersBefore = await page.evaluate(() => window.__workers.length);
  await page.evaluate(() => {
    const file = new File(['small'], 'too-large.log');
    Object.defineProperty(file, 'size', { value: 151 * 1024 * 1024 });
    file.arrayBuffer = file.text = () => { throw new Error('must not read'); };
    const input = document.getElementById('bugreport-file');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  });
  assert.match(await page.locator('#bugreport-error').innerText(), /150 MiB/);
  assert.equal(await page.evaluate(() => window.__workers.length), workersBefore);
  assert.equal(await page.locator('#bugreport-results').evaluate(element => element.hidden), false);
  console.log('PASS: invalid file selection is rejected before reading or replacing a result');
  assert.deepEqual(pageErrors, []);
} finally {
  await browser.close();
}

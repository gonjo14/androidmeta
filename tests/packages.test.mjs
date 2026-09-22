import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadAnalysis, read } from './helpers.mjs';

const apk = overrides => ({ path: '/data/app/com.example/base.apk', sha256: 'A'.repeat(64), verified_certificate: false, trusted_certificate: false, certificate: { Sha256: '', Subject: '', ValidFrom: '0001-01-01T00:00:00Z', ValidTo: '0001-01-01T00:00:00Z', SerialNumber: null }, ...overrides });
const pkg = overrides => ({ name: 'com.example.app', files: [apk()], installer: 'null', uid: 10001, disabled: false, system: false, third_party: true, ...overrides });
const analyse = (api, packages) => api.PackageAnalysis.analyse(JSON.stringify(packages));

test('empty certificate placeholders and false flags remain unknown', () => {
  const result = analyse(loadAnalysis(), [pkg()]);
  const file = result.packages[0].files[0];
  assert.equal(file.certificate, null);
  assert.equal(file.certificate_status, 'unknown');
  assert.equal(file.verified_certificate, false);
  assert.equal(file.trusted_certificate, false);
  assert.equal(result.counts.certificate_metadata, 0);
  assert.equal(result.counts.certificate_unknown, 1);
  assert.equal(result.counts.packages_with_data_errors, 0);
  assert.equal(file.sha256, 'a'.repeat(64));
});

test('inventory counts distinguish packages, split APKs, and reported states', () => {
  const result = analyse(loadAnalysis(), [pkg({ installer: ' com.example.store ', files: [apk(), apk({ path: '/data/app/com.example/split.apk' })] }), pkg({ name: 'android', uid: 1000, system: true, third_party: false, disabled: true })]);
  assert.equal(result.counts.packages, 2);
  assert.equal(result.counts.apk_files, 3);
  assert.equal(result.counts.system, 1);
  assert.equal(result.counts.third_party, 1);
  assert.equal(result.counts.disabled, 1);
  assert.equal(result.packages[0].installer, 'com.example.store');
  assert.equal(result.packages[1].installer, null);
  assert.equal(result.counts.third_party_installer_not_recorded, 0);
  assert.equal(result.counts.system_packages_in_data_app, 1);
  assert.equal(result.packages[1].findings.length, 0);
});

test('missing fields are unknown instead of false; string booleans are rejected', () => {
  const api = loadAnalysis();
  const result = analyse(api, [{ name: 'com.example.minimal' }]);
  assert.equal(result.packages[0].disabled, null);
  assert.equal(result.packages[0].classification, 'unknown');
  assert.equal(result.counts.disabled_unknown, 1);
  assert.throws(() => analyse(api, [pkg({ system: 'false' })]), /\$\[0\]\.system must be true, false, or null/);
  assert.throws(() => analyse(api, [pkg({ uid: '10001' })]), /uid must be a non-negative integer/);
});

test('certificate metadata, reported verification, and source errors are distinct', () => {
  const result = analyse(loadAnalysis(), [pkg({ files: [
    apk({ certificate: { Sha256: 'b'.repeat(64) } }),
    apk({ verified_certificate: true }),
    apk({ certificate_error: 'Could not parse certificate', error: 'APK extraction failed' }),
  ] })]);
  assert.deepEqual(Array.from(result.packages[0].files, file => file.certificate_status), ['metadata-only', 'verified-reported', 'error-reported']);
  assert.equal(result.counts.certificate_metadata, 1);
  assert.equal(result.counts.certificate_verified_reported, 1);
  assert.equal(result.counts.certificate_errors, 1);
  assert.equal(result.counts.collection_errors, 1);
  assert.ok(result.packages[0].findings.some(finding => finding.evidence === '$[0].files[2].certificate_error'));
});

test('bad hashes and conflicting classification become data review items', () => {
  const result = analyse(loadAnalysis(), [pkg({ system: true, third_party: true, files: [apk({ sha256: 'not-a-hash' })] })]);
  assert.equal(result.counts.sha256_invalid, 1);
  assert.equal(result.counts.unclassified, 1);
  assert.equal(result.counts.packages_with_data_errors, 1);
  assert.ok(result.packages[0].findings.some(finding => finding.code === 'classification-conflict'));
  assert.equal(result.packages[0].findings.some(finding => /malware|malicious/i.test(finding.code)), false);
});

test('duplicate package records and shared UIDs preserve separate evidence', () => {
  const result = analyse(loadAnalysis(), [pkg(), pkg()]);
  assert.equal(result.counts.packages, 2);
  assert.equal(result.counts.distinct_names, 1);
  assert.equal(result.counts.shared_uid_groups, 1);
  assert.deepEqual(Array.from(result.packages, record => record.evidence), ['$[0]', '$[1]']);
  assert.equal(result.counts.packages_with_data_errors, 0);
});

test('schema validation rejects npm manifests, broken JSON, and malformed nested records', () => {
  const api = loadAnalysis();
  assert.throws(() => api.PackageAnalysis.analyse('{'), /Invalid JSON/);
  assert.throws(() => api.PackageAnalysis.analyse('{"dependencies":{}}'), /Expected an array of Android packages/);
  assert.throws(() => analyse(api, [null]), /package object/);
  assert.throws(() => analyse(api, [{}]), /name must contain/);
  assert.throws(() => analyse(api, [pkg({ files: {} })]), /files must be an array/);
  assert.throws(() => analyse(api, [pkg({ files: [null] })]), /\$\[0\]\.files\[0\] must be an object/);
});

test('package and file record limits are enforced', () => {
  const api = loadAnalysis({ limits: { MAX_PACKAGES: 1, MAX_PACKAGE_FILES: 1 } });
  assert.throws(() => analyse(api, [pkg(), pkg()]), /exceeds 1 package/);
  assert.throws(() => analyse(api, [pkg({ files: [apk(), apk()] })]), /too many APK/);
});

test('filters combine type, disabled state, installer, hash, and evidence gaps', () => {
  const api = loadAnalysis();
  const result = analyse(api, [pkg(), pkg({ name: 'com.example.other', installer: 'com.example.store', disabled: true, files: [apk({ sha256: 'b'.repeat(64) })] })]);
  assert.equal(api.PackageAnalysis.page(result.packages, { review: 'third-party-missing-installer' }).total, 1);
  assert.equal(api.PackageAnalysis.page(result.packages, { disabled: 'true', installer: 'com.example.store', query: 'b'.repeat(64) }).records[0].name, 'com.example.other');
  assert.equal(api.PackageAnalysis.page(result.packages, { type: 'system' }).total, 0);
  assert.equal(api.PackageAnalysis.page(result.packages, { review: 'data-errors' }).total, 0);
  assert.equal(api.PackageAnalysis.page(result.packages, { review: 'certificate-unknown' }).total, 2);
});

test('pagination clamps stale pages and accepts an empty inventory', () => {
  const api = loadAnalysis();
  const result = analyse(api, Array.from({ length: 123 }, (_, index) => pkg({ name: `com.example.app${index}` })));
  const page = api.PackageAnalysis.page(result.packages, {}, 999);
  assert.equal(page.page, 2);
  assert.equal(page.pages, 3);
  assert.equal(page.records.length, 23);
  assert.equal(page.records[0].source_index, 100);
  const empty = api.PackageAnalysis.page(analyse(api, []).packages, {}, 3);
  assert.equal(empty.pages, 1);
  assert.equal(empty.page, 0);
  assert.equal(empty.total, 0);
});

test('worker imports package JSON without entering the log parser', async () => {
  const api = loadAnalysis({ worker: true });
  const messages = await api.send({ type: 'open', tool: 'packages', file: new File([JSON.stringify([pkg()])], 'packages.json') });
  assert.equal(messages.at(-1).type, 'result');
  assert.equal(messages.at(-1).summary.tool, 'packages');
  assert.equal(messages.at(-1).summary.counts.packages, 1);
  assert.equal(api.PackageAnalysis.isSummary(messages.at(-1).summary), true);
  const unsupported = await api.send({ type: 'open', tool: 'logcat', file: new File(['[]'], 'packages.json') });
  assert.equal(unsupported.at(-1).type, 'error');
});

test('package file size and extension are validated before reading', async () => {
  const api = loadAnalysis({ worker: true });
  let reads = 0;
  const messages = await api.send({ type: 'open', tool: 'packages', file: { name: 'packages.json', size: api.AnalysisConfig.MAX_PACKAGE_BYTES + 1, text() { reads++; }, arrayBuffer() { reads++; } } });
  assert.equal(reads, 0);
  assert.match(messages.at(-1).message, /20 MiB/);
  assert.match(api.validateCapture({ name: 'capture.zip', size: 1 }, 'packages'), /packages.json/);
});

test('Markdown export preserves evidence and contains no asserted malware score', () => {
  const api = loadAnalysis();
  vm.runInContext(read('src/packages-view.js'), api.scope);
  const view = vm.runInContext('PackagesView', api.scope);
  const result = analyse(api, [pkg()]);
  const output = view.markdown(result);
  assert.match(output, /com\.example\.app/);
  assert.match(output, /\$\[0\]\.files\[0\]/);
  assert.match(output, /Verification not established/);
  assert.doesNotMatch(output, /malware score|risk score/i);
});

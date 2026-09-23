const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const scope = vm.createContext({ Intl });
vm.runInContext(app.slice(0, app.indexOf('// PackageAnalysis is loaded')) + '\n'
  + fs.readFileSync(path.join(root, 'package-analysis.js'), 'utf8') + '\nglobalThis.api = PackageAnalysis;', scope);
const api = scope.api;
const plain = value => JSON.parse(JSON.stringify(value));
const record = (name, files = [], extras = {}) => ({ name, uid: 10001, files: files.map(filename => ({ path: `/data/app/example/${filename}`, sha256: 'a'.repeat(64) })), ...extras });
const analyse = input => api.analyse(JSON.stringify(input), 'inventory.json');

test('base, CPU, language, density and feature APKs stay in one package', () => {
  const report = analyse([record('com.example.app', ['base.apk', 'split_config.arm64_v8a.apk', 'split_config.en.apk', 'split_config.xhdpi.apk', 'split_feature.apk', 'split_feature.config.x86.apk'])]);
  assert.equal(report.packages.length, 1);
  assert.equal(report.counts.apk_files, 6);
  assert.equal(report.counts.multi_file_packages, 1);
  assert.equal(report.counts.apk_splits, 5);
  assert.deepEqual(plain(report.packages[0].files.map(file => file.apk.role)), ['base', 'cpu', 'language', 'density', 'feature', 'cpu']);
  assert.equal(report.packages[0].files[5].apk.module, 'feature');
  assert.equal(report.packages[0].findings.length, 0);
  assert.equal(report.packages[0].files[1].evidence, '$[0].files[1]');
  assert.equal(report.packages[0].files[1].sha256, 'a'.repeat(64));
});

test('manufacturer filenames require a matching base in the same folder', () => {
  const p = analyse([record('com.example.app', ['Example.apk', 'Example-arm64_v8a.apk', 'Example-xxxhdpi.apk'])]).packages[0];
  assert.deepEqual(plain(p.files.map(file => file.apk.role)), ['base', 'cpu', 'density']);
  const unknown = analyse([record('com.example.app', ['first.apk', 'second.apk'])]).packages[0];
  assert.equal(unknown.apk_group.status, 'multiple');
  assert.equal(unknown.apk_group.unknown_count, 2);
  const dirs = analyse([{ name: 'com.example.app', files: [{path:'/one/Example.apk'}, {path:'/two/Example-en.apk'}] }]).packages[0];
  assert.equal(dirs.apk_group.split_count, 0);
});

test('empty, single, missing-base and duplicate-name records are retained', () => {
  const s = analyse([record('com.example.app', []), record('com.example.app', ['base.apk']), record('com.example.app', ['split_config.en.apk'])]);
  assert.equal(s.packages.length, 3);
  assert.deepEqual(plain(s.packages.map(p => p.apk_group.status)), ['empty', 'single', 'split']);
  assert.equal(s.packages[2].apk_group.base_count, 0);
});

test('optional labels, aliases, nulls, Unicode, and long version codes are preserved', () => {
  const s = analyse([
    record('com.example.app', ['base.apk'], { applicationInfo: {label:'読書 App'}, versionName:'2.4.1', longVersionCode:'9223372036854775807' }),
    record('com.example.snake', [], {app_label:'Reader', version_name:'0', version_code:0}),
    record('com.example.missing', [], {label:'null', versionName:null}),
  ]);
  assert.equal(s.packages[0].display_name, '読書 App');
  assert.equal(s.packages[0].metadata.label.evidence, '$[0].applicationInfo.label');
  assert.equal(s.packages[0].metadata.version_code.value, '9223372036854775807');
  assert.equal(s.packages[1].metadata.version_code.value, '0');
  assert.equal(s.packages[2].display_name, 'com.example.missing');
  assert.equal(s.packages[2].metadata.version_name, null);
  assert.throws(() => analyse([record('com.example.bad', [], {versionCode:9007199254740992})]), /decimal string/);
});

test('catalogue names are fallbacks; recorded labels take precedence', () => {
  const s = analyse([record('com.google.android.gm'), record('com.google.android.gm', [], {label:'Local Gmail label'})]);
  assert.equal(s.packages[0].display_name, 'Gmail');
  assert.equal(s.packages[0].display_name_source, 'catalogue');
  assert.equal(s.packages[1].display_name, 'Local Gmail label');
  assert.equal(s.packages[1].display_name_source, 'inventory');
});

test('metadata imports match exact IDs and preserve original evidence on conflicts', () => {
  const s = analyse([record('com.example.app', ['base.apk'], {versionCode:20}), record('com.example.other')]);
  const e = api.enrich(s, JSON.stringify({ 'com.example.app': {label:'App', versionCode:21, versionName:'2.1'}, 'com.example.unknown':{versionName:'1'} }), 'extra.json');
  assert.equal(e.packages[0].display_name, 'App');
  assert.equal(e.packages[0].metadata.version_code.value, '20');
  assert.equal(e.packages[0].metadata.version_name, null);
  assert.equal(e.packages[0].metadata_conflicts.length, 2);
  assert.equal(e.metadata_import.unmatched_records, 1);
  assert.equal(s.packages[0].metadata.label, null);
  assert.equal(e.source_file, s.source_file);
  assert.equal(e.analyzed_at, s.analyzed_at);
});

test('duplicate package IDs require UID disambiguation for metadata', () => {
  const s = analyse([record('com.example.app', [], {uid:10001}), record('com.example.app', [], {uid:1010001})]);
  const ambiguous = api.enrich(s, JSON.stringify([{name:'com.example.app',label:'A'}]), 'details.json');
  assert.equal(ambiguous.metadata_import.updated_packages, 0);
  assert.equal(ambiguous.metadata_import.ambiguous_packages, 2);
  const known = api.enrich(s, JSON.stringify([{name:'com.example.app',uid:10001,label:'A'}]), 'details.json');
  assert.equal(known.metadata_import.updated_packages, 1);
  assert.equal(known.packages[1].metadata.label, null);
});

test('dumpsys active versions are read; hidden factory versions and activity labels are skipped', () => {
  const dump = 'Activity Resolver Table:\n  Package [com.example.app] (x):\n    versionName=wrong\nPackages:\n  Package [com.example.app] (a):\n    versionCode=12 minSdk=21 targetSdk=35\n    versionName=1.2\n    applicationInfo=ApplicationInfo{x}\n      nonLocalizedLabel=Activity title\nHidden system packages:\n  Package [com.example.app] (b):\n    versionCode=1\n    versionName=old\n';
  const e = api.enrich(analyse([record('com.example.app')]), dump, 'dumpsys.txt');
  const p = e.packages[0];
  assert.equal(p.metadata.version_name.value, '1.2');
  assert.equal(p.metadata.version_code.value, '12');
  assert.equal(p.metadata.version_name.evidence, 'line 7');
  assert.equal(p.metadata.label, null);
  assert.throws(() => api.parseMetadata('unrelated text', 'empty.txt'), /No app labels or versions/);
});

test('filters, exports and v1/v2 saved summaries keep grouped data and metadata', () => {
  const s = analyse([record('com.example.app', ['base.apk','split_config.en.apk'], {label:'Reader',versionName:'9.8'}),record('com.example.other',['one.apk'])]);
  assert.equal(api.page(s.packages, {layout:'multiple'}).total, 1);
  assert.equal(api.page(s.packages, {query:'Reader'}).total, 1);
  assert.equal(api.page(s.packages, {query:'9.8'}).total, 1);
  const exported = api.filteredReport(s, {layout:'split'});
  assert.equal(exported.matching_packages, 1);
  assert.equal(exported.packages[0].files.length, 2);
  assert.equal(exported.packages[0].metadata.label.value, 'Reader');
  for (const version of [1,2]) {
    const old = plain(s); old.version=version;
    old.packages.forEach(p => {delete p.metadata;delete p.apk_group;delete p.display_name;});
    assert.equal(api.isSummary(old), true);
    const restored = api.withOrigins(old);
    assert.equal(restored.packages[0].apk_group.split_count, 1);
    assert.equal(restored.packages[0].metadata.label, null);
  }
});

// Optional local acceptance fixture; user captures are not bundled with the app.
if (process.env.PACKAGE_INVENTORY_FIXTURE) test('real inventory retains 255 packages and all 373 APK file records', () => {
  const s=api.analyse(fs.readFileSync(process.env.PACKAGE_INVENTORY_FIXTURE,'utf8'));
  assert.equal(s.counts.packages,255); assert.equal(s.counts.apk_files,373);
  assert.equal(s.counts.multi_file_packages,30); assert.equal(s.counts.split_packages,30);
  assert.equal(s.counts.apk_splits,118); assert.equal(s.counts.packages_with_findings,0);
  const duo=s.packages.find(p=>p.name==='com.google.android.apps.tachyon');
  assert.equal(duo.apk_group.summary,'1 base + 3 splits');
  if(process.env.PACKAGE_DUMPSYS_FIXTURE) {
    const e=api.enrich(s,fs.readFileSync(process.env.PACKAGE_DUMPSYS_FIXTURE,'utf8'),'bugreport.txt');
    assert.equal(e.metadata_import.updated_packages,255);
    assert.equal(e.counts.version_names_recorded,255);
    assert.equal(e.counts.version_codes_recorded,255);
    assert.equal(e.counts.labels_recorded,0);
  }
});

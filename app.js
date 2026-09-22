'use strict';
// Shared by the UI and worker. The build includes this file in both contexts.
const AnalysisConfig = Object.freeze({
  MAX_FILE_BYTES: 150 * 1024 * 1024,
  FILE_LIMIT_LABEL: '150 MiB',
  MAX_LINES: 10_000_000,
  MAX_ARCHIVE_ENTRIES: 1_000,
  PAGE_SIZE: 100,
  QUERY_DEBOUNCE_MS: 180,
  ROW_PREVIEW_CHARS: 450,
  CONTEXT_BEFORE: 12,
  CONTEXT_AFTER: 32,
  CONTEXT_LINE_CHARS: 16_000,
  MAX_PACKAGE_BYTES: 20 * 1024 * 1024,
  PACKAGE_LIMIT_LABEL: '20 MiB',
  MAX_PACKAGES: 10_000,
  MAX_PACKAGE_FILES: 100_000,
  PACKAGE_PAGE_SIZE: 50,
});

// Metadata checks must run before reading bytes, on both sides of the worker.
function validateCapture(file, tool = 'logcat') {
  if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0) {
    return 'Choose a valid file from your device.';
  }
  if (file.size === 0) return 'This file is empty. Choose a capture with data.';
  const packages = tool === 'packages';
  const limit = packages ? AnalysisConfig.MAX_PACKAGE_BYTES : AnalysisConfig.MAX_FILE_BYTES;
  const label = packages ? AnalysisConfig.PACKAGE_LIMIT_LABEL : AnalysisConfig.FILE_LIMIT_LABEL;
  if (file.size > limit) {
    return `This file exceeds the ${label} limit. Choose a smaller capture.`;
  }
  if (packages) return /\.json$/i.test(file.name) ? null : 'Choose a packages.json inventory file.';
  if (!/\.(txt|log|zip)$/i.test(file.name)) return 'Choose a .txt, .log, or .zip file.';
  return null;
}

;
// Curated public-source evidence, not a reputation or APK-signature database.
// Exact-ID evidence and namespace hints are separate; hints never assign country.
const PackageOrigins = (() => {
  'use strict';
  const VERSION = '2026-09-22.2';
  const CHECKED_AT = '2026-09-22';
  const SCOPE = 'China-linked means a listed publisher based in mainland China, or a documented parent group with substantial operations there. Publisher location and group links are shown separately.';
  const LIMITATION = 'Exact-ID catalogue matches record publisher evidence. Namespace hints suggest a publisher or platform but leave country unverified. Neither authenticates the installed APK or assesses app safety. Unclassified does not mean non-Chinese; a publisher listed elsewhere does not exclude other China connections.';
  const play = id => ({ title: 'Google Play publisher listing', url: `https://play.google.com/store/apps/details?id=${id}&hl=en` });
  const oneplus = (id, appName) => [id, {
    status: 'china-linked', basis: 'china-publisher', app_name: appName,
    publisher: 'OnePlus Ltd. / 深圳市万普拉斯科技有限公司', publisher_country: 'CN', group: null,
    reason: 'The exact package listing identifies this publisher with a registered address in Shenzhen, China.',
    sources: [play(id)],
  }];
  const review = (id, appName, publisher, reason) => [id, {
    status: 'needs-review', basis: 'unresolved', app_name: appName,
    publisher, publisher_country: 'SG', group: null, reason, sources: [play(id)],
  }];
  const listedPublisher = (id, appName, publisher, country) => [id, {
    status: 'publisher-recorded', basis: 'listed-publisher', app_name: appName,
    publisher, publisher_country: country, group: null,
    reason: 'The current listing for this exact package ID identifies this publisher and country. Parent-company connections and the installed APK signer have not been established by this rule.',
    sources: [play(id)],
  }];
  const entries = [
    listedPublisher('com.sec.android.app.sbrowser', 'Samsung Browser', 'Samsung Electronics Co., Ltd.', 'KR'),
    listedPublisher('com.samsung.android.app.notes', 'Samsung Notes', 'Samsung Electronics Co., Ltd.', 'KR'),
    listedPublisher('com.google.android.gm', 'Gmail', 'Google LLC', 'US'),
    listedPublisher('com.android.chrome', 'Google Chrome', 'Google LLC', 'US'),
    listedPublisher('com.microsoft.office.outlook', 'Microsoft Outlook', 'Microsoft Corporation', 'US'),
    listedPublisher('com.facebook.katana', 'Facebook', 'Meta Platforms, Inc.', 'US'),
    oneplus('com.oneplus.note', 'OnePlus Notes'),
    oneplus('com.oneplus.backuprestore', 'Clone Phone - OnePlus app'),
    oneplus('net.oneplus.forums', 'OnePlus Community'),
    ['com.wondershare.transmore', {
      status: 'china-linked', basis: 'china-publisher', app_name: 'Tracover: Chat Track & Recover',
      publisher: 'Shenzhen Wondershare Software Co., Ltd.', publisher_country: 'CN', group: null,
      reason: 'The current listing for this exact ID names a developer with a Shenzhen, China address. The current store title may differ from the version in the inventory.',
      sources: [play('com.wondershare.transmore')],
    }],
    ['com.einnovation.temu', {
      status: 'china-linked', basis: 'china-operating-group', app_name: 'Temu',
      publisher: 'Whaleco Inc.', publisher_country: 'US', group: 'PDD Holdings',
      reason: 'PDD lists Whaleco Inc. as a subsidiary and Temu as its platform. Its 2025 annual report describes substantial China operations and assets. This is a group-operation link: Whaleco is US-incorporated, and PDD is Cayman-incorporated with principal offices in Ireland.',
      sources: [play('com.einnovation.temu'), { title: 'PDD 2025 annual report, cover, pp. 1–5, 164 and Exhibit 8.1', url: 'https://investor.pddholdings.com/static-files/92dafbdc-3125-4f2c-a28f-3d61203efbaf' }],
    }],
    review('com.oplus.melody', 'Wireless Earphones', 'HEYTAP PTE. LTD.', 'The listing describes an OPPO/OnePlus earphone utility but names a Singapore publisher. A controlling-company connection has not been established in this catalogue.'),
    review('com.oppo.quicksearchbox', 'Global Search', 'HEYTAP PTE. LTD.', 'The listed publisher is in Singapore. The package namespace alone does not establish its current controlling company or a China link.'),
    review('com.lenovo.anyshare.gps', 'SHAREit', 'SMART MEDIA4U TECHNOLOGY PTE. LTD.', 'The current listing names a Singapore publisher. The historical-looking package namespace is insufficient to establish current ownership.'),
    review('com.camerasideas.instashot', 'InShot', 'SHANTANU PTE. LIMITED', 'The current listing names a Singapore publisher. A China-based controlling company has not been established in this catalogue.'),
    review('com.oakever.tiletrip', 'Tile Explorer - Triple Match', 'OAKEVER GAMES PTE. LTD.', 'The current listing names a Singapore publisher. A China-based controlling company has not been established in this catalogue.'),
    ['com.oneplus.soundrecorder', {
      status: 'needs-review', basis: 'unresolved', app_name: null,
      publisher: null, publisher_country: null, group: null,
      reason: 'The namespace suggests OnePlus, whose policy identifies a Shenzhen company, but this exact package-to-publisher mapping was not verified. It is excluded from documented matches.',
      sources: [{ title: 'OnePlus privacy policy (brand evidence only)', url: 'https://www.oneplus.com/gr/legal/privacy-policy' }],
    }],
  ];
  const catalogue = new Map(entries);
  if (catalogue.size !== entries.length) throw new Error('Duplicate package ID in origin catalogue.');
  for (const [id, entry] of catalogue) {
    if (!entry.sources.length || entry.sources.some(source => !/^https:\/\//.test(source.url))) throw new Error(`Missing HTTPS evidence for ${id}.`);
  }

  // The source demonstrates the namespace on an official app; it does NOT
  // verify every ID sharing it. These rules create hints, never country labels.
  const namespaceHints = [
    { prefix: 'com.samsung.', name: 'Samsung', source: play('com.samsung.android.app.notes') },
    { prefix: 'com.sec.', name: 'Samsung', source: play('com.sec.android.app.sbrowser') },
    { prefix: 'com.google.', name: 'Google', source: play('com.google.android.gm') },
    { prefix: 'com.microsoft.', name: 'Microsoft', source: play('com.microsoft.office.outlook') },
    { prefix: 'com.facebook.', name: 'Meta / Facebook', source: play('com.facebook.katana') },
  ];
  const platformSource = { title: 'AOSP system-package documentation (platform context only)', url: 'https://source.android.com/docs/core/permissions/preinstalled-packages' };

  function lookup(name, pkg = {}) {
    const entry = catalogue.get(name);
    if (entry) return { ...entry, match_method: 'exact-package-id', publisher_hint: null, matched_namespace: null, matched_package: name, checked_at: CHECKED_AT, catalogue_version: VERSION, sources: entry.sources.map(source => ({ ...source })) };
    const hint = typeof name === 'string' ? namespaceHints.find(rule => name.startsWith(rule.prefix) && name.length > rule.prefix.length) : null;
    const platform = pkg.system === true && pkg.third_party !== true && typeof name === 'string' && (name === 'android' || name.startsWith('com.android.') || name.startsWith('android.'));
    if (hint || platform) {
      const prefix = hint?.prefix || (name === 'android' ? 'android' : name.startsWith('com.android.') ? 'com.android.' : 'android.');
      const source = hint ? { ...hint.source, title: 'Official example of this namespace (not this package)' } : platformSource;
      return {
        status: 'publisher-hint', basis: hint ? 'publisher-namespace' : 'platform-namespace',
        app_name: null, publisher: null, publisher_country: null, group: null,
        publisher_hint: hint?.name || 'Android platform / device vendor',
        matched_package: null, matched_namespace: prefix, match_method: 'namespace-hint',
        reason: hint
          ? `The ${prefix} namespace suggests ${hint.name}. This is an inference from the name, not verified publisher ownership. It does not establish the package country or rule out a China connection.`
          : 'The collector reports a system package using an Android platform namespace. Device manufacturers can modify and sign platform packages; their publisher and country remain unestablished.',
        checked_at: CHECKED_AT, catalogue_version: VERSION, sources: [{ ...source }],
      };
    }
    return {
      status: 'unclassified', basis: 'not-in-catalogue', app_name: null,
      publisher: null, publisher_country: null, group: null, matched_package: null,
      match_method: 'none', publisher_hint: null, matched_namespace: null,
      reason: 'No reviewed exact-ID rule is available. Country and ownership remain unestablished.',
      checked_at: null, catalogue_version: VERSION, sources: [],
    };
  }

  function metadata() {
    return { version: VERSION, checked_at: CHECKED_AT, scope: SCOPE, limitation: LIMITATION, match_method: 'exact-package-id-with-separate-namespace-hints', rule_count: catalogue.size, namespace_hint_rules: namespaceHints.length, platform_hints_require_system_flag: true };
  }
  return Object.freeze({ lookup, metadata });
})();

;
// Analyses inventory evidence only. It does not read APKs or perform reputation lookups.
const PackageAnalysis = (() => {
  'use strict';
  const VERSION = 2;
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isHash = value => /^[a-f0-9]{64}$/i.test(value || '');

  function string(value, path) {
    if (value == null) return null;
    if (typeof value !== 'string') throw new Error(`${path} must be a string or null.`);
    return value.trim() || null;
  }

  function boolean(value, path) {
    if (value == null) return null;
    if (typeof value !== 'boolean') throw new Error(`${path} must be true, false, or null.`);
    return value;
  }

  function certificate(value, path) {
    if (value == null) return null;
    if (!isObject(value)) throw new Error(`${path} must be an object or null.`);
    const result = {};
    for (const key of ['Md5', 'Sha1', 'Sha256', 'ValidFrom', 'ValidTo', 'Issuer', 'Subject', 'SignatureAlgorithm']) {
      result[key] = string(value[key], `${path}.${key}`);
      if (['ValidFrom', 'ValidTo'].includes(key) && /^0001-01-01(?:T|$)/.test(result[key] || '')) result[key] = null;
    }
    const serial = value.SerialNumber;
    if (serial != null && typeof serial !== 'string' && !Number.isSafeInteger(serial)) {
      throw new Error(`${path}.SerialNumber must be a string, safe integer, or null.`);
    }
    result.SerialNumber = serial == null ? null : String(serial).trim() || null;
    return Object.values(result).some(item => item !== null) ? result : null;
  }

  function normalizeFile(value, packageIndex, fileIndex) {
    const evidence = `$[${packageIndex}].files[${fileIndex}]`;
    if (!isObject(value)) throw new Error(`${evidence} must be an object.`);
    const cert = certificate(value.certificate, `${evidence}.certificate`);
    const verified = boolean(value.verified_certificate, `${evidence}.verified_certificate`);
    const trusted = boolean(value.trusted_certificate, `${evidence}.trusted_certificate`);
    const certificateError = string(value.certificate_error, `${evidence}.certificate_error`);
    const hash = string(value.sha256, `${evidence}.sha256`);
    return {
      source_index: fileIndex,
      evidence,
      path: string(value.path, `${evidence}.path`),
      local_name: string(value.local_name, `${evidence}.local_name`),
      sha256: isHash(hash) ? hash.toLowerCase() : hash,
      sha256_status: !hash ? 'missing' : isHash(hash) ? 'recorded' : 'invalid',
      error: string(value.error, `${evidence}.error`),
      certificate: cert,
      verified_certificate: verified,
      trusted_certificate: trusted,
      certificate_error: certificateError,
      // False plus absent certificate fields is not evidence of a bad signature.
      certificate_status: certificateError ? 'error-reported' : verified === true ? 'verified-reported' : cert ? 'metadata-only' : 'unknown',
    };
  }

  function normalizePackage(value, index) {
    const evidence = `$[${index}]`;
    if (!isObject(value)) throw new Error(`${evidence} must be a package object.`);
    const name = string(value.name, `${evidence}.name`);
    if (!name) throw new Error(`${evidence}.name must contain a package name.`);
    if (name.length > 512) throw new Error(`${evidence}.name is too long.`);
    const files = value.files ?? [];
    if (!Array.isArray(files)) throw new Error(`${evidence}.files must be an array.`);
    const uid = value.uid ?? null;
    if (uid !== null && (!Number.isSafeInteger(uid) || uid < 0)) throw new Error(`${evidence}.uid must be a non-negative integer or null.`);
    const system = boolean(value.system, `${evidence}.system`);
    const thirdParty = boolean(value.third_party, `${evidence}.third_party`);
    const installer = string(value.installer, `${evidence}.installer`);
    return {
      source_index: index, evidence, name, uid,
      installer: installer?.toLowerCase() === 'null' ? null : installer,
      system, third_party: thirdParty,
      disabled: boolean(value.disabled, `${evidence}.disabled`),
      classification: system === true && thirdParty === true ? 'conflicting' : system === true ? 'system' : thirdParty === true ? 'third-party' : 'unknown',
      files: files.map((file, fileIndex) => normalizeFile(file, index, fileIndex)),
      findings: [],
    };
  }

  function analyse(text, source = 'packages.json', progress = () => {}) {
    let input;
    try { input = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch (_) { throw new Error('Invalid JSON. Export the package inventory as UTF-8 JSON and try again.'); }
    if (!Array.isArray(input)) throw new Error('Expected an array of Android packages with name and files fields. An npm package.json or an exported analysis report is a different format.');
    if (input.length > AnalysisConfig.MAX_PACKAGES) throw new Error(`This inventory exceeds ${AnalysisConfig.MAX_PACKAGES.toLocaleString('en-US')} package records.`);
    let fileCount = 0;
    for (const entry of input) {
      if (Array.isArray(entry?.files)) fileCount += entry.files.length;
      if (fileCount > AnalysisConfig.MAX_PACKAGE_FILES) throw new Error('This inventory contains too many APK file entries. Split the inventory and try again.');
    }
    progress('Validating package fields…', true);
    const packages = input.map(normalizePackage);
    const names = new Map(), uids = new Map(), installers = new Map();
    for (const pkg of packages) {
      names.set(pkg.name, (names.get(pkg.name) || 0) + 1);
      if (pkg.uid !== null) uids.set(pkg.uid, (uids.get(pkg.uid) || 0) + 1);
      installers.set(pkg.installer, (installers.get(pkg.installer) || 0) + 1);
    }
    const counts = {
      packages: packages.length, distinct_names: names.size, system: 0, third_party: 0,
      unclassified: 0, disabled: 0, disabled_unknown: 0, apk_files: fileCount,
      installer_not_recorded: 0, third_party_installer_not_recorded: 0,
      sha256_recorded: 0, sha256_missing: 0, sha256_invalid: 0,
      certificate_metadata: 0, certificate_verified_reported: 0, certificate_unknown: 0,
      certificate_errors: 0, collection_errors: 0, packages_with_findings: 0,
      packages_with_data_errors: 0, system_packages_in_data_app: 0,
      shared_uid_groups: [...uids.values()].filter(count => count > 1).length,
    };
    for (const pkg of packages) {
      const add = (code, level, detail, evidence = pkg.evidence) => pkg.findings.push({ code, level, detail, evidence });
      if (pkg.classification === 'system') counts.system++;
      else if (pkg.classification === 'third-party') counts.third_party++;
      else counts.unclassified++;
      if (pkg.disabled === true) counts.disabled++;
      if (pkg.disabled === null) counts.disabled_unknown++;
      if (pkg.installer === null) {
        counts.installer_not_recorded++;
        if (pkg.classification === 'third-party') {
          counts.third_party_installer_not_recorded++;
          add('installer-not-recorded', 'info', 'No installer is recorded for this third-party package. The installation source cannot be established from this inventory.', `${pkg.evidence}.installer`);
        }
      }
      if (pkg.classification === 'conflicting') add('classification-conflict', 'review', 'Both system and third_party are true. Check the inventory collector.');
      if (!pkg.files.length) add('files-not-recorded', 'info', 'No APK file entries were supplied.', `${pkg.evidence}.files`);
      if (names.get(pkg.name) > 1) add('duplicate-package-name', 'info', `This name occurs ${names.get(pkg.name)} times. Records are kept separately; this schema does not identify Android user profiles.`, `${pkg.evidence}.name`);
      if (pkg.classification === 'system' && pkg.files.some(file => file.path?.startsWith('/data/app/'))) counts.system_packages_in_data_app++;
      for (const file of pkg.files) {
        counts[`sha256_${file.sha256_status}`]++;
        if (file.sha256_status !== 'recorded') add(`sha256-${file.sha256_status}`, file.sha256_status === 'invalid' ? 'review' : 'info', file.sha256_status === 'invalid' ? 'The recorded APK SHA-256 is not 64 hexadecimal characters.' : 'No APK SHA-256 is recorded.', `${file.evidence}.sha256`);
        if (!file.path) add('path-not-recorded', 'info', 'No APK path is recorded.', `${file.evidence}.path`);
        if (file.certificate) counts.certificate_metadata++;
        if (file.verified_certificate === true) counts.certificate_verified_reported++;
        if (file.certificate_status === 'unknown') counts.certificate_unknown++;
        if (file.error) { counts.collection_errors++; add('collection-error', 'review', file.error, `${file.evidence}.error`); }
        if (file.certificate_error) { counts.certificate_errors++; add('certificate-error', 'review', file.certificate_error, `${file.evidence}.certificate_error`); }
      }
      if (pkg.findings.length) counts.packages_with_findings++;
      if (pkg.findings.some(finding => finding.level === 'review')) counts.packages_with_data_errors++;
    }
    return withOrigins({
      tool: 'packages', version: VERSION, source_file: source, analyzed_at: new Date().toISOString(),
      counts, packages,
      installers: [...installers].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))),
      notes: [
        'All values describe the supplied inventory. APK contents were not provided or examined.',
        'Recorded SHA-256 values are checked for format only; they are not recomputed from APK bytes or checked against a reputation service.',
        'Empty certificate fields and false verification/trust flags do not establish an invalid signature. Verification is not established unless a result is explicitly recorded.',
        'Installer names, system flags, shared UIDs, and package names do not establish whether an app is safe or malicious.',
        'System packages under /data/app can be updated system applications. Their path alone does not change their reported classification.',
        'Permissions, accessibility status, version numbers, install times, and behaviour are not available in this schema.',
      ],
      limits: { package_records: AnalysisConfig.MAX_PACKAGES, apk_files: AnalysisConfig.MAX_PACKAGE_FILES, file_bytes: AnalysisConfig.MAX_PACKAGE_BYTES },
    });
  }

  // Refresh saved v1/v2 reports against the shipped catalogue without changing
  // their capture date or mutating the original evidence.
  function withOrigins(summary) {
    const packages = summary.packages.map(pkg => ({ ...pkg, origin: PackageOrigins.lookup(pkg.name, pkg) }));
    const counts = { ...summary.counts, china_linked: 0, china_publisher: 0, origin_needs_review: 0, origin_publisher_recorded: 0, origin_publisher_hint: 0, origin_unclassified: 0 };
    for (const pkg of packages) {
      if (pkg.origin.status === 'china-linked') counts.china_linked++;
      if (pkg.origin.basis === 'china-publisher') counts.china_publisher++;
      if (pkg.origin.status === 'needs-review') counts.origin_needs_review++;
      if (pkg.origin.status === 'publisher-recorded') counts.origin_publisher_recorded++;
      if (pkg.origin.status === 'publisher-hint') counts.origin_publisher_hint++;
      if (pkg.origin.status === 'unclassified') counts.origin_unclassified++;
    }
    return { ...summary, version: VERSION, packages, counts, origin_catalogue: PackageOrigins.metadata() };
  }

  function matches(pkg, filters = {}) {
    const origin = pkg.origin || PackageOrigins.lookup(pkg.name, pkg);
    if (filters.origin === 'china-publisher' && origin.basis !== 'china-publisher') return false;
    if (filters.origin === 'exclude-china-linked' && origin.status === 'china-linked') return false;
    if (['china-linked', 'needs-review', 'publisher-recorded', 'publisher-hint', 'unclassified'].includes(filters.origin) && origin.status !== filters.origin) return false;
    if (filters.type && pkg.classification !== filters.type) return false;
    if (filters.disabled === 'true' && pkg.disabled !== true) return false;
    if (filters.disabled === 'false' && pkg.disabled !== false) return false;
    if (filters.disabled === 'unknown' && pkg.disabled !== null) return false;
    if (filters.installer && pkg.installer !== filters.installer) return false;
    if (filters.review === 'missing-installer' && pkg.installer !== null) return false;
    if (filters.review === 'third-party-missing-installer' && !(pkg.installer === null && pkg.classification === 'third-party')) return false;
    if (filters.review === 'findings' && !pkg.findings.length) return false;
    if (filters.review === 'data-errors' && !pkg.findings.some(finding => finding.level === 'review')) return false;
    if (filters.review === 'certificate-unknown' && !pkg.files.some(file => file.certificate_status === 'unknown')) return false;
    const query = (filters.query || '').trim().toLowerCase();
    if (!query) return true;
    if (`${pkg.name} ${pkg.uid ?? ''} ${pkg.installer ?? ''} ${origin.app_name ?? ''} ${origin.publisher ?? ''} ${origin.publisher_hint ?? ''} ${origin.group ?? ''}`.toLowerCase().includes(query)) return true;
    return pkg.files.some(file => `${file.path ?? ''} ${file.sha256 ?? ''} ${file.certificate?.Sha256 ?? ''}`.toLowerCase().includes(query));
  }

  function page(packages, filters = {}, requested = 0) {
    const matchesFound = packages.filter(pkg => matches(pkg, filters));
    const pages = Math.max(1, Math.ceil(matchesFound.length / AnalysisConfig.PACKAGE_PAGE_SIZE));
    const value = Number(requested);
    const current = Math.min(pages - 1, Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0));
    return { total: matchesFound.length, page: current, pages, records: matchesFound.slice(current * AnalysisConfig.PACKAGE_PAGE_SIZE, (current + 1) * AnalysisConfig.PACKAGE_PAGE_SIZE) };
  }

  function isSummary(value) {
    if (!isObject(value) || value.tool !== 'packages' || ![1, VERSION].includes(value.version) || !isObject(value.counts)) return false;
    if (!Array.isArray(value.packages) || value.packages.length > AnalysisConfig.MAX_PACKAGES || !Array.isArray(value.installers) || !Array.isArray(value.notes)) return false;
    return value.packages.every(pkg => isObject(pkg) && typeof pkg.name === 'string' && Number.isSafeInteger(pkg.source_index) && Array.isArray(pkg.files) && Array.isArray(pkg.findings) && pkg.files.every(isObject) && pkg.findings.every(isObject)) && value.installers.every(row => Array.isArray(row) && row.length === 2);
  }

  function filteredReport(summary, filters = {}) {
    const selection = Object.fromEntries(['query', 'type', 'disabled', 'installer', 'review', 'origin'].map(key => [key, typeof filters[key] === 'string' ? filters[key] : '']));
    const packages = summary.packages.filter(pkg => matches(pkg, selection));
    return {
      tool: 'packages-filtered', version: 1, source_file: summary.source_file,
      analyzed_at: summary.analyzed_at, exported_at: new Date().toISOString(),
      inventory_packages: summary.packages.length, matching_packages: packages.length,
      filters: selection, origin_catalogue: summary.origin_catalogue,
      notes: summary.notes, packages,
    };
  }

  return { analyse, matches, page, isSummary, withOrigins, filteredReport };
})();

;
const PackagesView = (() => {
  'use strict';
  const classification = { system: 'System (reported)', 'third-party': 'Third-party (reported)', unknown: 'Not established', conflicting: 'Conflicting flags' };
  const certificateLabels = { 'verified-reported': 'Verified according to source', 'error-reported': 'Certificate error reported', 'metadata-only': 'Metadata present; verification not established', unknown: 'Verification not established' };
  const recordedBoolean = value => value === true ? 'True' : value === false ? 'False' : 'Not recorded';
  const originLabels = { 'china-linked': 'China-linked · documented', 'needs-review': 'Needs review', 'publisher-recorded': 'Listed publisher · country recorded', 'publisher-hint': 'Namespace hint · country unverified', unclassified: 'Unclassified' };
  const basisLabels = { 'china-publisher': 'Publisher based in China', 'china-operating-group': 'Group operations in China', 'listed-publisher': 'Exact-ID publisher listing', 'publisher-namespace': 'Publisher namespace inference', 'platform-namespace': 'Reported system package with platform namespace', unresolved: 'Ownership or mapping unresolved', 'not-in-catalogue': 'No catalogue rule' };

  function originBadge(origin, escapeHTML) {
    const tone = origin.status === 'china-linked' ? 'linked' : origin.status === 'needs-review' ? 'warn' : 'neutral';
    return `<span class="badge ${tone}">${escapeHTML(originLabels[origin.status])}</span>`;
  }

  function sourceLinks(origin, escapeHTML) {
    return origin.sources.filter(source => /^https:\/\//.test(source.url)).map(source => `<li><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)}</a></li>`).join('');
  }

  function render(summary, view, helpers) {
    const { $, escapeHTML, number, stat, panel, table, notes, download } = helpers;
    const c = summary.counts;
    const certificateNote = c.certificate_metadata === 0
      ? `No certificate metadata is populated in the ${number(c.apk_files)} APK entries.`
      : `${number(c.certificate_metadata)} of ${number(c.apk_files)} APK entries contain certificate metadata.`;
    $('packages-results').innerHTML = `
      <div class="stats">
        ${stat('Packages', c.packages, `${number(c.distinct_names)} distinct names`)}
        ${stat('System', c.system, 'Classification reported by the collector')}
        ${stat('Third-party', c.third_party, 'Classification reported by the collector')}
        ${stat('Disabled', c.disabled, 'State reported by the collector')}
      </div>
      <section class="panel origin-panel">
        <div class="panel-header"><h2>Publisher and China connection coverage</h2><span class="tiny">Catalogue checked ${escapeHTML(summary.origin_catalogue.checked_at)}</span></div>
        <p>${escapeHTML(summary.origin_catalogue.scope)}</p>
        <div class="origin-counts"><span><strong>${number(c.china_linked)}</strong> documented China links</span><span><strong>${number(c.origin_needs_review)}</strong> need review</span><span><strong>${number(c.origin_publisher_recorded)}</strong> other publisher listings</span><span><strong>${number(c.origin_publisher_hint)}</strong> namespace hints · country unverified</span><span><strong>${number(c.origin_unclassified)}</strong> without a match or hint</span></div>
        <p class="hint">${escapeHTML(summary.origin_catalogue.limitation)}</p>
        <div class="button-row"><button class="button primary" id="package-show-china">Show documented China links</button><button class="button" id="package-show-review">Show needs review</button><button class="button" id="package-show-hints">Show namespace hints</button></div>
      </section>
      <div class="notice"><strong>${escapeHTML(certificateNote)}</strong><p>${number(c.certificate_verified_reported)} entries report successful verification. Empty certificate fields and false flags leave verification unestablished. No APK bytes are examined here.</p></div>
      <div class="split equal">
        ${panel('Inventory coverage', '', table(['Evidence', 'Count'], [
          ['APK file entries', number(c.apk_files)],
          ['Recorded SHA-256 values with valid format', number(c.sha256_recorded)],
          ['Missing / malformed SHA-256 values', `${number(c.sha256_missing)} / ${number(c.sha256_invalid)}`],
          ['Packages with data errors to review', number(c.packages_with_data_errors)],
          ['Third-party packages without a recorded installer', number(c.third_party_installer_not_recorded)],
          ['Shared UID groups', number(c.shared_uid_groups)],
          ['System packages with a file in /data/app', number(c.system_packages_in_data_app)],
        ]))}
        ${panel('Recorded installers', 'Names describe the inventory; they do not establish app trust.', table(['Installer', 'Packages'], summary.installers.map(([name, count]) => [escapeHTML(name ?? 'Not recorded'), number(count)])))}
      </div>
      <section class="panel">
        <h2>Package explorer</h2>
        <div class="filters">
          <div class="field"><label for="package-query">Search</label><input id="package-query" type="search" placeholder="Package, app, publisher, UID, SHA-256…"></div>
          <div class="field"><label for="package-origin">Publisher / China connection</label><select id="package-origin"><option value="">All packages</option><option value="china-linked">Documented China links</option><option value="china-publisher">Publisher based in China only</option><option value="needs-review">Needs review</option><option value="publisher-recorded">Other publisher listings</option><option value="publisher-hint">Namespace hints · country unverified</option><option value="unclassified">Unclassified · no match or hint</option><option value="exclude-china-linked">Exclude documented matches</option></select></div>
          <div class="field"><label for="package-type">Reported type</label><select id="package-type"><option value="">All types</option><option value="system">System</option><option value="third-party">Third-party</option><option value="unknown">Unknown</option><option value="conflicting">Conflicting</option></select></div>
          <div class="field"><label for="package-disabled">Reported state</label><select id="package-disabled"><option value="">All states</option><option value="false">Not disabled</option><option value="true">Disabled</option><option value="unknown">Not recorded</option></select></div>
          <div class="field"><label for="package-installer">Installer</label><select id="package-installer"><option value="">All installers</option>${summary.installers.filter(([name]) => name !== null).map(([name]) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}</select></div>
          <div class="field"><label for="package-review">Evidence filter</label><select id="package-review"><option value="">All packages</option><option value="third-party-missing-installer">Third-party; installer not recorded</option><option value="missing-installer">Any type; installer not recorded</option><option value="findings">Has review notes</option><option value="data-errors">Data errors reported</option><option value="certificate-unknown">Has an APK with unknown verification</option></select></div>
        </div>
        <div class="filter-footer"><span id="package-count" role="status"></span><div class="button-row"><button class="button small" id="package-clear">Clear filters</button><button class="button small" id="package-export">Export matching JSON</button></div></div>
        <div id="package-list"></div>
        <div class="pagination"><span id="package-page"></span><div class="button-row"><button class="button small" id="package-prev">Previous</button><button class="button small" id="package-next">Next</button></div></div>
      </section>
      ${panel('How to interpret this inventory', '', notes(summary.notes))}`;

    function updateRows() {
      const result = PackageAnalysis.page(summary.packages, view.filters, view.page);
      view.page = result.page;
      $('package-count').textContent = `${number(result.total)} matching packages`;
      $('package-page').textContent = `Page ${number(result.page + 1)} of ${number(result.pages)}`;
      $('package-prev').disabled = result.page === 0;
      $('package-next').disabled = result.page + 1 >= result.pages;
      $('package-list').innerHTML = table(['Package / UID', 'China connection', 'Reported type / state', 'Installer', 'APK files', 'Notes', 'Evidence'], result.records.map(pkg => [
        `${escapeHTML(pkg.name)}<br><span class="tiny">UID ${escapeHTML(pkg.uid ?? 'Not recorded')}</span>`,
        `${originBadge(pkg.origin, escapeHTML)}<br><span class="tiny">${escapeHTML(pkg.origin.publisher_hint || pkg.origin.app_name || basisLabels[pkg.origin.basis])}</span>`,
        `${escapeHTML(classification[pkg.classification])}<br><span class="tiny">${pkg.disabled === true ? 'Disabled' : pkg.disabled === false ? 'Not disabled' : 'Disabled state not recorded'}</span>`,
        escapeHTML(pkg.installer ?? 'Not recorded'),
        number(pkg.files.length),
        pkg.findings.length ? `${number(pkg.findings.length)} review note(s)` : 'No inventory issues identified',
        `<button class="button small" data-package="${pkg.source_index}">Inspect record</button>`,
      ]));
    }

    const filterKeys = ['query', 'type', 'disabled', 'installer', 'review', 'origin'];
    for (const key of filterKeys) {
      const input = $(`package-${key}`);
      input.value = view.filters[key] || '';
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
        view.filters[key] = input.value;
        view.page = 0;
        updateRows();
      });
    }
    $('package-prev').onclick = () => { view.page--; updateRows(); };
    $('package-next').onclick = () => { view.page++; updateRows(); };
    $('package-clear').onclick = () => {
      view.filters = {}; view.page = 0;
      for (const key of filterKeys) $(`package-${key}`).value = '';
      updateRows();
    };
    function selectOrigin(origin) {
      // This overview shortcut intentionally starts a fresh selection.
      view.filters = { origin };
      view.page = 0;
      for (const key of filterKeys) $(`package-${key}`).value = view.filters[key] || '';
      updateRows();
      $('package-origin').focus();
    }
    $('package-show-china').onclick = () => selectOrigin('china-linked');
    $('package-show-review').onclick = () => selectOrigin('needs-review');
    $('package-show-hints').onclick = () => selectOrigin('publisher-hint');
    $('package-export').onclick = () => {
      const report = PackageAnalysis.filteredReport(summary, view.filters);
      download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), 'packages-filtered.json');
    };
    updateRows();
  }

  function showDetails(summary, sourceIndex, helpers) {
    if (!summary) return;
    const pkg = summary.packages.find(record => record.source_index === Number(sourceIndex));
    if (!pkg) return;
    const { $, escapeHTML, number, panel, table } = helpers;
    $('package-title').textContent = pkg.name;
    $('package-meta').textContent = `${summary.source_file} · JSON record ${pkg.evidence}`;
    const origin = pkg.origin;
    $('package-content').innerHTML = panel('China connection evidence', '', `${originBadge(origin, escapeHTML)}
      <p>${escapeHTML(origin.reason)}</p>
      ${table(['Field', 'Catalogue evidence'], [
        ['Current listed app', escapeHTML(origin.app_name || 'Not established')],
        ['Publisher', escapeHTML(origin.publisher || 'Not established')],
        ['Publisher country code', escapeHTML(origin.publisher_country || 'Not established')],
        ['Publisher / platform hint (unverified)', escapeHTML(origin.publisher_hint || 'None')],
        ['Matched namespace (hint only)', escapeHTML(origin.matched_namespace || 'None')],
        ['Match method', escapeHTML(origin.match_method || 'exact-package-id')],
        ['Group', escapeHTML(origin.group || 'Not established')],
        ['Basis', escapeHTML(basisLabels[origin.basis])],
        ['Matched package', escapeHTML(origin.matched_package || 'No exact match')],
        ['Source checked', escapeHTML(origin.checked_at || 'Not reviewed')],
        ['Catalogue version', escapeHTML(origin.catalogue_version)],
      ])}
      ${origin.sources.length ? `<ul class="notes">${sourceLinks(origin, escapeHTML)}</ul>` : ''}
      <p class="hint">${escapeHTML(summary.origin_catalogue.limitation)}</p>`)
      + panel('Reported package fields', '', table(['Field', 'Value'], [
      ['UID', escapeHTML(pkg.uid ?? 'Not recorded')],
      ['Installer', escapeHTML(pkg.installer ?? 'Not recorded')],
      ['system', recordedBoolean(pkg.system)],
      ['third_party', recordedBoolean(pkg.third_party)],
      ['disabled', recordedBoolean(pkg.disabled)],
    ])) + panel('Review notes', '', pkg.findings.length ? pkg.findings.map(finding => `<div class="finding"><p>${escapeHTML(finding.detail)}</p><span class="tiny">${escapeHTML(finding.evidence)} · ${escapeHTML(finding.code)}</span></div>`).join('') : '<p>No inventory issues were identified by these checks.</p>')
      + panel('APK file evidence', `${number(pkg.files.length)} file entries. Hashes and certificate flags are reported metadata.`, pkg.files.map(file => `
        <article class="finding"><h3>${escapeHTML(file.path ?? 'Path not recorded')}</h3>
          <p class="tiny">${escapeHTML(file.evidence)}</p>
          <dl class="key-value">
            <dt>APK SHA-256</dt><dd><code>${escapeHTML(file.sha256 ?? 'Not recorded')}</code></dd>
            <dt>Hash format</dt><dd>${escapeHTML(file.sha256_status)}</dd>
            <dt>Certificate status</dt><dd>${escapeHTML(certificateLabels[file.certificate_status])}</dd>
            <dt>verified_certificate (source)</dt><dd>${recordedBoolean(file.verified_certificate)}</dd>
            <dt>trusted_certificate (source)</dt><dd>${recordedBoolean(file.trusted_certificate)}</dd>
            <dt>Collection error</dt><dd>${escapeHTML(file.error ?? 'None reported')}</dd>
            <dt>Certificate error</dt><dd>${escapeHTML(file.certificate_error ?? 'None reported')}</dd>
          </dl>
          ${file.certificate ? `<details><summary>Recorded certificate metadata</summary><pre>${escapeHTML(JSON.stringify(file.certificate, null, 2))}</pre></details>` : '<p class="tiny">No populated certificate metadata in this entry.</p>'}
        </article>`).join('') || '<p>No file entries recorded.</p>');
    if (!$('package-dialog').open) $('package-dialog').showModal();
  }

  function markdown(summary) {
    const block = value => String(value ?? '').split('\n').map(line => `    ${line}`).join('\n');
    const lines = ['# Package inventory analysis', '', 'Source:', '', block(summary.source_file), '', `Analysed: ${summary.analyzed_at}`, '', '## Counts', ''];
    for (const [key, count] of Object.entries(summary.counts)) lines.push(`- ${key.replace(/_/g, ' ')}: ${count}`);
    lines.push('', '## China connection catalogue', '', `Version: ${summary.origin_catalogue.version}; checked: ${summary.origin_catalogue.checked_at}.`, '', summary.origin_catalogue.scope, '', summary.origin_catalogue.limitation);
    lines.push('', '## Interpretation', '', ...summary.notes.map(note => `- ${note}`), '', '## Recorded installers', '');
    for (const [installer, count] of summary.installers) lines.push(block(`${installer ?? 'Not recorded'}: ${count}`), '');
    lines.push('## Package evidence', '');
    for (const pkg of summary.packages) {
      lines.push(`### Record ${pkg.source_index}`, '', block(`${pkg.name}\nSource: ${pkg.evidence}\nUID: ${pkg.uid ?? 'Not recorded'}\nType: ${classification[pkg.classification]}\nDisabled: ${recordedBoolean(pkg.disabled)}\nInstaller: ${pkg.installer ?? 'Not recorded'}`), '');
      const origin = pkg.origin;
      lines.push(block(`China connection: ${originLabels[origin.status]}\nBasis: ${basisLabels[origin.basis]}\nPublisher: ${origin.publisher || 'Not established'}\nPublisher country: ${origin.publisher_country || 'Not established'}\nUnverified publisher/platform hint: ${origin.publisher_hint || 'None'}\nMatched namespace: ${origin.matched_namespace || 'None'}\nGroup: ${origin.group || 'Not established'}\nReason: ${origin.reason}\nSources checked: ${origin.checked_at || 'Not reviewed'}`), '');
      for (const source of origin.sources) lines.push(block(`${source.title}: ${source.url}`), '');
      for (const finding of pkg.findings) lines.push(block(`${finding.evidence}: ${finding.detail}`), '');
      for (const file of pkg.files) lines.push(block(`${file.evidence}\nPath: ${file.path ?? 'Not recorded'}\nAPK SHA-256: ${file.sha256 ?? 'Not recorded'}\nCertificate: ${certificateLabels[file.certificate_status]}\nverified_certificate: ${recordedBoolean(file.verified_certificate)}\ntrusted_certificate: ${recordedBoolean(file.trusted_certificate)}\nCollection error: ${file.error ?? 'None reported'}\nCertificate error: ${file.certificate_error ?? 'None reported'}`), '');
    }
    return lines.join('\n');
  }

  return { render, showDetails, markdown };
})();

;
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = value => Number(value || 0).toLocaleString();
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const bytes = n => n < 1048576 ? `${(n / 1024).toFixed(1)} KiB` : `${(n / 1048576).toFixed(1)} MiB`;
  function createToolState() {
    return { worker: null, summary: null, tab: 'overview', busy: false, fileSize: 0, page: 0, queryId: 0, filters: {} };
  }
  const state = { bugreport: createToolState(), logcat: createToolState(), packages: createToolState() };
  const titles = { bugreport: 'Bug Report Analyser', logcat: 'Log Analyser', packages: 'Package Analyser' };
  const historyKey = 'android_tools_history_v2';
  let route = 'home', toastTimer = null, queryTimer = null, contextTool = null, contextTarget = 1;
  let contextRequestId = 0;
  const packageUI = { $, escapeHTML, number, stat, panel, table, notes, download };

  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
  }
  function navigate(next) {
    route = ['home', ...Object.keys(titles)].includes(next) ? next : 'home';
    document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== route; });
    document.querySelectorAll('.nav-item').forEach(button => {
      const active = button.dataset.route === route;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('breadcrumb').textContent = `Workspace / ${titles[route] || 'Overview'}`;
    document.title = route === 'home' ? 'Android Tools — Local diagnostics' : `${titles[route]} — Android Tools`;
    if (location.hash !== `#${route}`) { try { history.replaceState(null, '', `#${route}`); } catch (_) { /* file previews may restrict history */ } }
    $('main').focus({ preventScroll: true });
  }

  function renderTool(tool) {
    const log = tool === 'logcat';
    const packages = tool === 'packages';
    const view = {
      logcat: {
        eyebrow: 'LOGCAT INVESTIGATION', noun: 'logcat file',
        subtitle: 'Find the important events in logcat.txt, then inspect the lines around them.',
        upload: 'Open a saved logcat capture or choose a log file inside a ZIP.',
        open: 'Supports threadtime, time, brief, and long logcat formats, including standard year and UID fields.',
        investigate: 'Separate crash markers from ordinary error logging. Search by message, tag, PID, buffer, or priority.',
      },
      bugreport: {
        eyebrow: 'DEVICE DIAGNOSTICS', noun: 'bugreport',
        subtitle: 'Review crashes, responsiveness, battery statistics, and app access in one capture.',
        upload: 'Open a bugreport ZIP or the extracted text report.',
        open: 'ZIP contents are inspected first so you can choose the right text report.',
        investigate: 'Check section coverage, crash details, wakelock activity, and observed package access.',
      },
      packages: {
        eyebrow: 'PACKAGE INVENTORY', noun: 'packages.json',
        subtitle: 'Filter China-linked apps and inspect package metadata, APK hashes, and installers.',
        upload: 'Open an Android package inventory exported as a JSON array.',
        open: 'Each record contains a package name and its APK file metadata. Parsing runs locally.',
        investigate: 'Review sourced China connections, reported system and third-party packages, installers, and missing data.',
      },
    }[tool];
    const uploadHint = packages
      ? `JSON · UP TO ${AnalysisConfig.PACKAGE_LIMIT_LABEL} / ${number(AnalysisConfig.MAX_PACKAGES)} PACKAGES · PROCESSED LOCALLY`
      : `TXT, LOG, ZIP · UP TO ${AnalysisConfig.FILE_LIMIT_LABEL} / ${number(AnalysisConfig.MAX_LINES)} LINES · PROCESSED LOCALLY`;
    $(tool).innerHTML = `
      <div class="page-heading"><div><div class="eyebrow">${view.eyebrow}</div><h1>${titles[tool]}</h1><p class="subtitle">${view.subtitle}</p></div><button class="button" data-demo="${tool}">Try a sample</button></div>
      <div id="${tool}-upload" class="upload-panel" data-drop="${tool}">
        <div class="upload-icon">${icon('upload')}</div><h2>Drop your ${view.noun} here</h2><p>${view.upload}</p>
        <div class="button-row"><button class="button primary" data-browse="${tool}">${icon('file')}Choose file</button></div><p class="upload-hint">${uploadHint}</p>
        <input id="${tool}-file" type="file" accept="${packages ? '.json' : '.txt,.log,.zip'}" hidden aria-label="Choose ${view.noun} file">
      </div>
      <label class="remember"><input id="${tool}-remember" type="checkbox">Remember analysis summaries in this browser</label>
      <div id="${tool}-error" class="notice error" role="alert" hidden></div>
      <div id="${tool}-loading" class="loading" hidden><span class="spinner" aria-hidden="true"></span><span id="${tool}-progress" class="loading-text" role="status" aria-live="polite">Reading your file…</span><button class="button small" data-cancel="${tool}">Cancel</button></div>
      <div id="${tool}-archive" class="archive-picker" hidden><h2>Choose a file from this archive</h2><p>The archive contains several text files. Select the capture to analyse.</p><label class="field-label" for="${tool}-entry">File in archive</label><select id="${tool}-entry"></select><div class="button-row"><button class="button primary" data-entry="${tool}">Analyse selected file</button><button class="button" data-cancel="${tool}">Cancel</button></div></div>
      <div id="${tool}-filebar" class="file-bar" hidden><div class="file-info">${icon('file')}<div><span class="filename" id="${tool}-filename"></span><span class="file-meta" id="${tool}-filemeta"></span></div></div><div class="button-row report-actions"><button class="button small" data-download="${tool}" data-format="json">${icon('download')}JSON</button><button class="button small" data-download="${tool}" data-format="md">Report</button><button class="button small" data-reset="${tool}">New file</button></div></div>
      <div id="${tool}-results" hidden></div>
      <div id="${tool}-help" class="help-grid"><div class="help-card"><span class="step">01 / OPEN</span><h3>Start with your capture</h3><p>${view.open}</p></div><div class="help-card"><span class="step">02 / INVESTIGATE</span><h3>Follow the evidence</h3><p>${view.investigate}</p></div><div class="help-card"><span class="step">03 / EXPORT</span><h3>Take the findings with you</h3><p>Download a JSON summary or a readable Markdown report.${log ? ' Export matching raw log entries too.' : ''}</p></div></div>`;
    $(`${tool}-file`).addEventListener('change', event => {
      const file = event.target.files[0]; if (file) openFile(tool, file); event.target.value = '';
    });
    const drop = $(`${tool}-upload`);
    for (const name of ['dragenter', 'dragover']) drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragging'); });
    drop.addEventListener('dragleave', event => { if (!drop.contains(event.relatedTarget)) drop.classList.remove('dragging'); });
    drop.addEventListener('drop', event => {
      event.preventDefault(); drop.classList.remove('dragging');
      if (event.dataTransfer.files.length !== 1) { showError(tool, 'Choose one file at a time.'); return; }
      openFile(tool, event.dataTransfer.files[0]);
    });
  }

  function showError(tool, message) {
    const box = $(`${tool}-error`); box.textContent = message; box.hidden = false;
  }
  function setBusy(tool, busy) {
    state[tool].busy = busy; $(`${tool}-loading`).hidden = !busy;
    $(tool).setAttribute('aria-busy', String(busy));
  }
  function reset(tool) {
    state[tool].worker?.terminate();
    if (tool === 'logcat') { clearTimeout(queryTimer); queryTimer = null; }
    Object.assign(state[tool], createToolState(), { queryId: state[tool].queryId + 1 });
    for (const id of ['loading', 'error', 'archive', 'filebar', 'results']) $(`${tool}-${id}`).hidden = true;
    $(`${tool}-results`).replaceChildren(); $(`${tool}-upload`).hidden = false; $(`${tool}-help`).hidden = false;
    $(tool).setAttribute('aria-busy', 'false');
    if (tool === 'packages' && $('package-dialog').open) $('package-dialog').close();
    if (contextTool === tool) {
      contextRequestId++;
      contextTool = null;
      if ($('context-dialog').open) $('context-dialog').close();
    }
  }
  function openFile(tool, file) {
    const validationError = validateCapture(file, tool);
    if (validationError) { showError(tool, validationError); return; }
    reset(tool);
    state[tool].fileSize = file.size;
    setBusy(tool, true); $(`${tool}-upload`).hidden = true; $(`${tool}-help`).hidden = true;
    $(`${tool}-progress`).textContent = `Opening ${file.name}…`;
    if (!('Worker' in window)) { failOpen(tool, 'This browser does not support analysis workers. Use a current browser.'); return; }
    let worker;
    try {
      // Relative to the page, including a GitHub Pages repository subpath.
      worker = new Worker(new URL('analysis-worker.js', document.baseURI));
    } catch (_) { failOpen(tool, 'The analysis worker could not start. Open the hosted site or use a local HTTP server, with all site files in the same folder.'); return; }
    state[tool].worker = worker;
    worker.onmessage = ({ data }) => { if (state[tool].worker === worker) handleMessage(tool, data); };
    worker.onerror = event => { event.preventDefault(); if (state[tool].worker === worker) failOpen(tool, 'Analysis stopped unexpectedly. Reload the site and check that analysis-worker.js is deployed beside index.html; for large captures, try a smaller file.'); };
    worker.onmessageerror = () => {
      if (state[tool].worker === worker) failOpen(tool, 'The browser could not receive the analysis result. Reopen the capture to try again.');
    };
    try {
      // File is structured-cloneable. Read and decode it inside the worker.
      worker.postMessage({ type: 'open', file, tool });
    } catch (_) {
      failOpen(tool, 'The browser could not pass this file to the local analyser. Reopen the capture to try again.');
    }
  }
  function failOpen(tool, message) {
    state[tool].worker?.terminate(); state[tool].worker = null;
    setBusy(tool, false); $(`${tool}-archive`).hidden = true; $(`${tool}-upload`).hidden = false; showError(tool, message);
  }
  function handleMessage(tool, data) {
    if (!data || typeof data.type !== 'string') return;
    const operation = data.type === 'error' ? data.operation : data.type;
    if (operation === 'query' && (tool !== 'logcat' || data.requestId !== state.logcat.queryId)) return;
    if (operation === 'context' && (contextTool !== tool || data.requestId !== contextRequestId || !$('context-dialog').open)) return;
    if (data.type === 'progress') $(`${tool}-progress`).textContent = data.message;
    if (data.type === 'archive') {
      setBusy(tool, false); $(`${tool}-archive`).hidden = false;
      $(`${tool}-entry`).replaceChildren(...data.entries.map(name => new Option(name, name)));
    }
    if (data.type === 'error') {
      if (['open', 'entry'].includes(data.operation)) failOpen(tool, data.message);
      else { showError(tool, data.message); if (data.operation === 'export') { const b = $('export-filtered'); if (b) b.disabled = false; } }
    }
    if (data.type === 'result') {
      state[tool].summary = data.summary; setBusy(tool, false); $(`${tool}-archive`).hidden = true;
      renderResult(tool);
      if ($(`${tool}-remember`).checked) remember(data.summary);
      toast(`${titles[tool]} finished.`);
    }
    if (data.type === 'query') renderLogRows(data);
    if (data.type === 'context') renderContext(data);
    if (data.type === 'export') {
      download(data.blob, 'filtered-logcat.txt');
      const button = $('export-filtered'); if (button) button.disabled = false;
      toast(`Exported ${number(data.count)} matching entries.`);
    }
  }

  function stat(label, value, note, tone = '') {
    return `<div class="stat"><div class="stat-label">${escapeHTML(label)}</div><div class="stat-number ${tone}">${number(value)}</div><div class="stat-note">${escapeHTML(note)}</div></div>`;
  }
  function tabs(tool, values) {
    return `<div class="tabs" aria-label="Analysis views">${values.map(([key, label]) => `<button class="tab ${state[tool].tab === key ? 'active' : ''}" data-tab="${key}" data-tool="${tool}" aria-pressed="${state[tool].tab === key}">${escapeHTML(label)}</button>`).join('')}</div>`;
  }
  function panel(title, description, content) {
    return `<section class="panel"><h2>${escapeHTML(title)}</h2>${description ? `<p>${escapeHTML(description)}</p>` : ''}${content}</section>`;
  }
  function empty(message = 'No matching entries were found in this capture.') { return `<div class="empty">${escapeHTML(message)}</div>`; }
  function table(headers, rows, className = '') {
    return `<div class="table-wrap"><table class="${className}"><thead><tr>${headers.map(h => `<th scope="col">${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty" colspan="${headers.length}">No matching entries in this capture.</td></tr>`}</tbody></table></div>`;
  }
  function contextButton(tool, line, label) {
    return line && state[tool].worker ? `<button class="button small" data-context="${Number(line)}" data-tool="${tool}">${escapeHTML(label || `Line ${number(line)}`)}</button>` : '';
  }
  function notes(items) { return `<ul class="notes">${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`; }

  function renderResult(tool) {
    const s = state[tool].summary;
    if (!s) return;
    $(`${tool}-filebar`).hidden = false; $(`${tool}-results`).hidden = false;
    $(`${tool}-upload`).hidden = true; $(`${tool}-help`).hidden = true;
    $(`${tool}-filename`).textContent = s.source_file;
    $(`${tool}-filemeta`).textContent = `${state[tool].worker ? bytes(state[tool].fileSize) + ' · ' : 'Saved summary · '}${new Date(s.analyzed_at).toLocaleString()}`;
    const el = $(`${tool}-results`);
    if (tool === 'packages') {
      PackagesView.render(s, state.packages, packageUI);
    } else if (tool === 'logcat') {
      el.innerHTML = `<div class="stats">${stat('Log entries', s.parsed_records, `${number(s.physical_lines)} source lines`)}${stat('Error records', s.levels.E, 'Priority E · not all are crashes', s.levels.E ? 'danger' : '')}${stat('Warning records', s.levels.W, 'Priority W', s.levels.W ? 'warn' : '')}${stat('Crash markers', s.counts.native + s.counts.java, `${number(s.counts.anr)} ANR markers`, s.counts.native + s.counts.java ? 'danger' : '')}</div>${tabs(tool, [['overview', 'Overview'], ['findings', `Findings · ${number(s.finding_groups)}`], ['explorer', 'Log explorer']])}<div id="logcat-tab-content"></div>`;
      if (state[tool].tab === 'overview') renderLogOverview(s);
      if (state[tool].tab === 'findings') renderLogFindings(s);
      if (state[tool].tab === 'explorer') renderExplorer(s);
    } else {
      el.innerHTML = `<div class="stats">${stat('Java crashes', s.counts.java_crashes, 'FATAL EXCEPTION markers', s.counts.java_crashes ? 'danger' : '')}${stat('Native crashes', s.counts.native_crashes, 'Tombstones and fatal signals', s.counts.native_crashes ? 'danger' : '')}${stat('ANRs', s.counts.anrs, 'Application not responding', s.counts.anrs ? 'warn' : '')}${stat('Wakelocks', s.counts.wakelocks_reported, 'Distinct locks in available stats')}</div>${tabs(tool, [['overview', 'Overview'], ['crashes', 'Crashes & memory'], ['battery', 'Battery & wakelocks'], ['access', 'App access'], ['capture', 'Capture details']])}<div id="bugreport-tab-content"></div>`;
      renderBugTab(s);
    }
  }

  function findingCard(f, tool = 'logcat') {
    const danger = ['java', 'native'].includes(f.kind), warn = ['anr', 'memory'].includes(f.kind);
    return `<article class="finding"><div class="finding-top"><div class="button-row"><span class="badge ${danger ? 'danger' : warn ? 'warn' : 'neutral'}">${escapeHTML(f.label)}</span><span class="tiny">${number(f.count)} occurrence${f.count === 1 ? '' : 's'}</span></div>${contextButton(tool, f.line, 'View context')}</div><p class="finding-title">${escapeHTML(f.title)}</p><div class="finding-meta">${escapeHTML(f.process)} · line ${number(f.line)}${f.lastLine !== f.line ? `–${number(f.lastLine)}` : ''}${f.timestamp ? ` · ${escapeHTML(f.timestamp)}` : ''}</div><p class="finding-action">${escapeHTML(f.action)}</p><details><summary>Evidence${f.count > 1 ? ' & occurrences' : ''}</summary><pre>${escapeHTML(f.detail)}</pre>${(f.samples || []).length > 1 ? `<div class="button-row">${f.samples.map(line => contextButton(tool, line)).join('')}</div>` : ''}</details></article>`;
  }
  function renderLogOverview(s) {
    const levelNames = { V: 'Verbose', D: 'Debug', I: 'Info', W: 'Warning', E: 'Error', F: 'Fatal', A: 'Assert' };
    const max = Math.max(1, ...Object.values(s.levels));
    const bars = Object.entries(s.levels).filter(([k, n]) => n || k !== 'A').map(([level, count]) => `<div class="bar-row"><span class="priority ${level}" title="${levelNames[level]}">${level}</span><div class="bar-track"><div class="bar-fill ${['E', 'F', 'A'].includes(level) ? 'error' : level === 'W' ? 'warning' : ''}" style="width:${count / max * 100}%"></div></div><span class="bar-value">${number(count)}</span></div>`).join('');
    const tags = s.tags.slice(0, 10).map(([name, count]) => `<div class="tag-row"><button data-tag="${escapeHTML(name)}" title="Filter this tag">${escapeHTML(name)}</button><span>${number(count)}</span></div>`).join('');
    const crashCount = s.counts.native + s.counts.java;
    const headline = crashCount || s.counts.anr ? `${number(crashCount)} crash marker${crashCount === 1 ? '' : 's'} and ${number(s.counts.anr)} ANR marker${s.counts.anr === 1 ? '' : 's'} found.` : 'No explicit crash or ANR markers were found in this capture.';
    const body = `<div class="notice ${crashCount || s.counts.anr ? 'warning' : ''}"><strong>${headline}</strong><p>${number(s.levels.F + s.levels.A)} fatal-priority records were logged. Priority counts and crash counts describe different things.</p></div>`;
    $('logcat-tab-content').innerHTML = body + `<div class="split"><div>${panel('Start here', 'Findings are grouped by category, source, and message.', s.findings.slice(0, 5).map(f => findingCard(f)).join('') || empty('No recognised issue patterns. Open the explorer to inspect the log.'))}<button class="button" data-tab="findings" data-tool="logcat">View all finding groups ${icon('arrow')}</button></div><div>${panel('Log priorities', 'Distribution of recognised entries.', bars)}${panel('Most active tags', 'Select a tag to open it in the explorer.', tags)}</div></div>${panel('Capture notes', '', `<div class="capture-chips">${s.buffers.map(([b, n]) => `<span class="badge neutral">${escapeHTML(b)} · ${number(n)}</span>`).join('')}</div>${notes(s.notes)}<p class="hint">Coverage: ${number(s.parsed_records)} recognised entries, ${number(s.continuation_lines)} continuation lines, ${number(s.unparsed_lines)} unparsed lines. Formats: ${escapeHTML(s.formats.join(', '))}.</p>`)}`;
  }

  function renderLogFindings(s) {
    $('logcat-tab-content').innerHTML = `<section class="panel"><div class="panel-header"><h2>Finding groups</h2><span class="tiny">${number(s.finding_groups)} total</span></div><p>Repeated messages are grouped. Showing up to 200 prioritised groups; all recognised records remain searchable in the explorer.</p><div class="finding-toolbar"><input id="finding-search" type="search" aria-label="Search finding groups" placeholder="Search findings or processes…"><select id="finding-kind" aria-label="Finding category"><option value="">All categories</option>${Object.entries(s.counts).map(([key, count]) => `<option value="${key}">${escapeHTML(signalLabel(key))} (${number(count)})</option>`).join('')}</select></div><div id="finding-list"></div></section>${panel('Repeated warnings & errors', `Top ${Math.min(s.repeated.length, 100)} of ${number(s.repeated_groups)} message groups. Addresses and process IDs are normalised when grouping.`, table(['Level', 'Tag', 'Message', 'Count', 'Source'], s.repeated.map(r => [`<span class="priority ${r.level}">${r.level}</span>`, escapeHTML(r.tag), escapeHTML(r.message), number(r.count), contextButton('logcat', r.line)])))}`;
    const update = () => {
      const q = $('finding-search').value.toLowerCase(), kind = $('finding-kind').value;
      const rows = s.findings.filter(f => (!kind || f.kind === kind) && (!q || `${f.title} ${f.process} ${f.detail}`.toLowerCase().includes(q)));
      $('finding-list').innerHTML = `<div class="tiny">${number(rows.length)} matching groups in this summary</div>${rows.map(f => findingCard(f)).join('') || empty('No finding groups match these filters.')}`;
    };
    $('finding-search').addEventListener('input', update); $('finding-kind').addEventListener('change', update); update();
  }
  function signalLabel(key) {
    return ({ native: 'Native crash', java: 'Java crash', anr: 'ANR', memory: 'Memory pressure', exception: 'Exception', denial: 'SELinux denial', network: 'Network failure', jank: 'Skipped frames' })[key] || key;
  }
  function renderExplorer(s) {
    if (!state.logcat.worker) { $('logcat-tab-content').innerHTML = '<div class="notice">This is a saved summary. Reopen the source file to search the raw log or inspect source context.</div><button class="button primary" data-reset="logcat">Open a capture</button>'; return; }
    $('logcat-tab-content').innerHTML = `<section class="panel"><div class="panel-header"><h2>Log explorer</h2><span class="tiny">Original file order · 100 entries per page</span></div><div class="filters">
      <div class="field"><label for="log-query">Search messages</label><input id="log-query" type="search" placeholder="Message, exception, process…" autocomplete="off"></div>
      <div class="field"><label for="log-level">Minimum priority</label><select id="log-level"><option value="">All entries</option><option value="D">Debug and above</option><option value="I">Info and above</option><option value="W">Warning and above</option><option value="E">Error and above</option><option value="F">Fatal / assert</option><option value="?">Unparsed lines</option></select></div>
      <div class="field"><label for="log-buffer">Buffer</label><select id="log-buffer"><option value="">All buffers</option>${s.buffers.map(([name]) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}</select></div>
      <div class="field"><label for="log-tag">Tag contains</label><input id="log-tag" type="search" placeholder="e.g. AndroidRuntime" list="tag-list"><datalist id="tag-list">${s.tags.slice(0, 250).map(([name]) => `<option value="${escapeHTML(name)}"></option>`).join('')}</datalist></div>
      <div class="field"><label for="log-pid">Exact PID</label><input id="log-pid" type="text" inputmode="numeric" placeholder="e.g. 1205"></div>
      <div class="field"><label for="log-signal">Detected signal</label><select id="log-signal"><option value="">All signals & ordinary logs</option>${Object.keys(s.counts).map(key => `<option value="${key}">${escapeHTML(signalLabel(key))}</option>`).join('')}</select></div>
      </div><div class="filter-footer"><span id="log-count" class="result-label" role="status">Filtering…</span><div class="button-row"><button class="button small" id="clear-filters">Clear filters</button><button class="button small" id="export-filtered">${icon('download')}Export matching TXT</button></div></div><div class="table-wrap"><table class="logs-table"><colgroup><col class="col-line"><col class="col-time"><col class="col-level"><col class="col-pid"><col class="col-tag"><col></colgroup><thead><tr><th scope="col">Line</th><th scope="col">Recorded time</th><th scope="col">Level</th><th scope="col">PID</th><th scope="col">Tag</th><th scope="col">Message</th></tr></thead><tbody id="log-rows"></tbody></table></div><div class="pagination"><span id="log-page">Page 1</span><div class="button-row"><button class="button small" id="log-prev" disabled>Previous</button><button class="button small" id="log-next" disabled>Next</button></div></div></section>`;
    for (const key of ['query', 'level', 'buffer', 'tag', 'pid', 'signal']) {
      const input = $(`log-${key}`); input.value = state.logcat.filters[key] || '';
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
        state.logcat.filters[key] = input.value; state.logcat.page = 0; scheduleQuery();
      });
    }
    $('clear-filters').onclick = () => { state.logcat.filters = {}; state.logcat.page = 0; renderExplorer(s); };
    $('log-prev').onclick = () => { state.logcat.page--; requestQuery(); };
    $('log-next').onclick = () => { state.logcat.page++; requestQuery(); };
    $('export-filtered').onclick = () => { $('export-filtered').disabled = true; state.logcat.worker.postMessage({ type: 'export', filters: state.logcat.filters }); };
    requestQuery();
  }
  function markQueryPending() {
    if (!$('log-count')) return;
    $('log-count').textContent = 'Filtering…';
    $('log-prev').disabled = true;
    $('log-next').disabled = true;
  }
  function scheduleQuery() {
    clearTimeout(queryTimer);
    state.logcat.queryId++;
    markQueryPending();
    queryTimer = setTimeout(requestQuery, AnalysisConfig.QUERY_DEBOUNCE_MS);
  }
  function requestQuery() {
    clearTimeout(queryTimer);
    if (!state.logcat.worker || !$('log-count')) return;
    markQueryPending();
    state.logcat.worker.postMessage({ type: 'query', filters: state.logcat.filters, page: state.logcat.page, requestId: ++state.logcat.queryId });
  }
  function renderLogRows(data) {
    if (!$('log-rows')) return;
    state.logcat.page = data.page;
    $('log-count').textContent = `${number(data.total)} matching entries`;
    $('log-rows').innerHTML = data.records.length ? data.records.map(r => `<tr><td><button class="source-link" data-context="${r.line}" data-tool="logcat" aria-label="Context at line ${r.line}">${r.line}</button></td><td>${escapeHTML(r.timestamp || '—')}</td><td><span class="priority ${r.level}">${escapeHTML(r.level)}</span></td><td>${escapeHTML(r.pid || '—')}</td><td>${escapeHTML(r.tag)}</td><td>${escapeHTML(r.message)}${r.shortened ? '<span class="truncate-note"> … open context for more</span>' : ''}</td></tr>`).join('') : '<tr><td class="empty" colspan="6">No entries match these filters.</td></tr>';
    $('log-page').textContent = `Page ${number(data.page + 1)} of ${number(data.pages)}`;
    $('log-prev').disabled = data.page === 0; $('log-next').disabled = data.page + 1 >= data.pages;
  }

  function renderBugTab(s) {
    let content = '';
    const c = s.counts, d = s.device || {}, coverage = s.coverage || {};
    if (state.bugreport.tab === 'overview') {
      const total = c.java_crashes + c.native_crashes + c.anrs;
      const recommendations = [];
      if (c.java_crashes) recommendations.push(['Inspect Java exception chains', `${number(c.java_crashes)} fatal exception markers. Start with the deepest cause and first application frame.`]);
      if (c.native_crashes) recommendations.push(['Review native crash evidence', `${number(c.native_crashes)} crashes from tombstones or fatal signal markers. Read the abort message and stack before assigning a cause.`]);
      if (c.anrs) recommendations.push(['Check blocked main threads', `${number(c.anrs)} ANR markers. Inspect the associated traces and reason.`]);
      if (c.oom_kills || c.low_memory_events) recommendations.push(['Review memory pressure', `${number(c.oom_kills)} process-kill matches and ${number(c.low_memory_events)} low-memory matches.`]);
      if (c.wakelocks_reported) recommendations.push(['Review wakelock activity', s.battery_diagnosis.headline]);
      content = `<div class="notice ${total ? 'warning' : ''}"><strong>${total ? `${number(total)} crash and ANR records to investigate.` : 'No explicit crash or ANR records were found.'}</strong><p>${coverage.sectioned ? `${number(s.section_count)} report sections detected.` : 'No standard section headers detected.'} ${number(coverage.log_records)} logcat entries recognised.</p></div><div class="split">${panel('Investigation checklist', 'Suggested starting points from the available evidence.', recommendations.map(([title, message]) => `<div class="recommendation"><strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p></div>`).join('') || empty('No recognised issue patterns. Check Capture details for missing sections.'))}${panel('Processes with crash / ANR records', 'Counts combine the three crash and responsiveness checks.', table(['Process', 'Records'], s.top_offending_processes.map(([p, n]) => [escapeHTML(p), number(n)])))}</div>${panel('What this capture can tell you', '', `<div class="capture-chips"><span class="badge ${coverage.sectioned ? '' : 'warn'}">${coverage.sectioned ? 'Sectioned report' : 'Unstructured text'}</span><span class="badge ${coverage.battery ? '' : 'neutral'}">Battery stats: ${coverage.battery ? 'present' : 'not detected'}</span><span class="badge ${coverage.packages ? '' : 'neutral'}">Package data: ${coverage.packages ? 'present' : 'not detected'}</span></div>${notes(s.notes || ['Findings are limited to the supplied capture.'])}`)}`;
    }
    if (state.bugreport.tab === 'crashes') {
      content = panel('Java crashes', `Showing ${s.java_crashes.length} of ${number(c.java_crashes)} detected markers.`, table(['Process', 'Root exception / summary', 'Evidence'], s.java_crashes.map(r => [escapeHTML(r.process), escapeHTML(r.summary), `${contextButton('bugreport', r.line)}<details><summary>Stack excerpt</summary><pre>${escapeHTML(r.detail)}</pre></details>`])))
        + panel('Application not responding', `Showing ${s.anrs.length} of ${number(c.anrs)} detected markers.`, table(['Process', 'Reason / evidence', 'Source'], s.anrs.map(r => [escapeHTML(r.process), escapeHTML(r.detail || 'See the ANR trace in the original capture.'), contextButton('bugreport', r.line)])))
        + panel('Native crashes', `Showing ${s.native_crashes.length} of ${number(c.native_crashes)} crash records. Routine debugger stack captures are not treated as fatal signals.`, table(['Process / PID', 'Signal', 'Recorded time', 'Details'], s.native_crashes.map(r => [`${escapeHTML(r.cmdline)}<br><span class="tiny">PID ${escapeHTML(r.pid)} · ${escapeHTML(r.source || 'tombstone')}</span>`, `<span class="badge danger">${escapeHTML(r.signal)}</span>${r.fault_code ? `<p class="tiny">${escapeHTML(r.fault_code)}</p>` : ''}`, escapeHTML(r.timestamp || 'Not recorded'), `${contextButton('bugreport', r.line)}<details><summary>Crash excerpt</summary><pre>${escapeHTML(r.abort_message || r.detail || 'No abort message in this excerpt.')}\n${escapeHTML((r.backtrace || []).map(f => `#${f.frame} ${f.path} ${f.symbol || ''}`).join('\n') || 'No backtrace included.')}</pre></details>`])))
        + panel('Native crash review', s.crash_diagnosis.headline, s.crash_diagnosis.contributors.map(r => `<div class="finding"><h3>${escapeHTML(r.cmdline)} · ${escapeHTML(r.signal)}</h3>${notes((r.flags || []).map(f => f.detail))}${r.nearby_events?.length ? `<details><summary>Nearby activity (approx. ±10 seconds)</summary><pre>${escapeHTML(r.nearby_events.map(e => e.text).join('\n'))}</pre></details>` : ''}</div>`).join('') || empty())
        + `<div class="split equal">${panel('Memory pressure', `${number(c.low_memory_events)} low-memory matches; ${number(c.oom_kills)} process-kill matches. Examples below.`, table(['Evidence'], [...s.low_memory_events.map(e => [escapeHTML(e)]), ...s.oom_kills.map(e => [escapeHTML(`Process killed: ${e.process}`)])]))}${panel('Skipped frames', 'Logged frame skips are performance signals, not a measured frame rate.', `<dl class="key-value"><dt>Events</dt><dd>${number(s.frame_drops.count)}</dd><dt>Total skipped</dt><dd>${number(s.frame_drops.total_skipped)}</dd><dt>Largest event</dt><dd>${number(s.frame_drops.max_skipped)}</dd></dl>`)}</div>`;
    }
    if (state.bugreport.tab === 'battery') {
      const b = s.battery_diagnosis;
      content = panel('Battery & wakelock review', b.headline, `<div class="notice">Held times can overlap and are not a measure of battery energy consumed.${b.total_battery_seconds ? ` Reported on-battery window: ${number(Math.round(b.total_battery_seconds / 60))} minutes.` : ' No on-battery duration was found to normalise these observations.'}</div>${b.contributors.map(w => `<div class="finding"><h3>${escapeHTML(w.name)}</h3><div class="finding-meta">${escapeHTML(w.type)} · ${escapeHTML(w.realtime)} · ${number(w.times)} acquisitions${w.package ? ` · ${escapeHTML(w.package)}` : ''}</div><p class="finding-action">${escapeHTML(w.reason)}${w.pct_of_battery_time != null ? ` Held time is ${number(w.pct_of_battery_time)}% of the reported on-battery window.` : ''}</p><div class="diagnostic-flags">${(w.flags || []).map(f => `<span class="badge neutral">${escapeHTML(f)}</span>`).join('')}</div></div>`).join('')}`)
        + panel('Wakelocks by held time', `Showing ${s.wakelocks.length} of ${number(c.wakelocks_reported)} distinct wakelocks.`, table(['Type', 'UID', 'Name', 'Held time', 'Acquisitions'], s.wakelocks.map(w => [escapeHTML(w.type), escapeHTML(w.uid || '—'), escapeHTML(w.name), escapeHTML(w.realtime), number(w.times)])));
    }
    if (state.bugreport.tab === 'access') {
      const a = s.stalkerware_indicators;
      content = panel('Observed app access', 'Correlates permissions, enabled accessibility services, device administration, and battery exemptions.', `<div class="notice">${escapeHTML(a.note)}</div>${a.contributors.map(p => `<div class="finding"><h3>${escapeHTML(p.package)}</h3><div class="finding-meta">${p.user_installed === false ? 'System / preinstalled package' : p.user_installed === true ? 'User-installed package' : 'Installation type unknown'}</div>${notes(p.flags.map(f => f.detail))}${p.granted_permissions?.length ? `<details><summary>Observed granted permissions</summary><pre>${escapeHTML(p.granted_permissions.join('\n'))}</pre></details>` : ''}</div>`).join('') || empty(coverage.packages ? 'No correlated access patterns were identified by these checks.' : 'Package and permission data was not detected in this capture.')}`);
    }
    if (state.bugreport.tab === 'capture') {
      const properties = [['Manufacturer', d.manufacturer], ['Model', d.model], ['Android', d.android], ['SDK', d.sdk], ['Build', d.build]];
      content = `<div class="split equal">${panel('Device information', 'Only values explicitly recorded in the capture are shown.', `<dl class="key-value">${properties.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHTML(v || 'Not available')}</dd>`).join('')}</dl>`)}${panel('Capture coverage', '', `<dl class="key-value"><dt>Source lines</dt><dd>${number(coverage.physical_lines)}</dd><dt>Log entries</dt><dd>${number(coverage.log_records)}</dd><dt>Sections</dt><dd>${number(s.section_count)}</dd><dt>Battery data</dt><dd>${coverage.battery ? 'Detected' : 'Not detected'}</dd><dt>Package data</dt><dd>${coverage.packages ? 'Detected' : 'Not detected'}</dd></dl>`)}</div>${panel('Sections found', `First ${s.sections_found.length} of ${number(s.section_count)} detected sections.`, `<div class="capture-chips">${s.sections_found.map(name => `<span class="badge neutral">${escapeHTML(name)}</span>`).join('')}</div>`)}${panel('Analysis notes', '', notes(s.notes || []))}`;
    }
    $('bugreport-tab-content').innerHTML = content;
  }

  function openContext(tool, line) {
    if (!state[tool].worker) { toast('Reopen the source file to view raw context.'); return; }
    contextTool = tool; contextTarget = Number(line);
    $('context-title').textContent = `Context at line ${number(line)}`;
    $('context-meta').textContent = state[tool].summary.source_file;
    $('context-content').innerHTML = '<div class="context-loading">Loading source lines…</div>';
    $('context-before').disabled = true; $('context-after').disabled = true;
    if (!$('context-dialog').open) $('context-dialog').showModal();
    state[tool].worker.postMessage({ type: 'context', line, requestId: ++contextRequestId });
  }
  function renderContext(data) {
    contextTarget = data.target;
    $('context-title').textContent = `Context at line ${number(data.target)}`;
    $('context-meta').textContent = `${state[contextTool].summary.source_file} · lines ${number(data.start)}–${number(data.end)} of ${number(data.total)}`;
    $('context-content').innerHTML = data.lines.map(row => `<div class="source-line ${row.line === data.target ? 'highlight' : ''}"><span>${row.line}</span><code>${escapeHTML(row.text)}${row.shortened ? ' … [long line shortened for display]' : ''}</code></div>`).join('');
    $('context-before').disabled = data.start === 1; $('context-after').disabled = data.end === data.total;
    $('context-content').querySelector('.highlight')?.scrollIntoView({ block: 'center' });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function markdown(s) {
    if (s.tool === 'packages') return PackagesView.markdown(s);
    const block = text => String(text ?? '').split('\n').map(line => `    ${line}`).join('\n');
    const lines = [`# ${titles[s.tool] || 'Bug Report Analyser'} report`, '', 'Source:', '', block(s.source_file), '', `Analysed: ${s.analyzed_at}`, '', '## Counts', ''];
    for (const [name, value] of Object.entries(s.counts)) lines.push(`- ${name.replace(/_/g, ' ')}: ${value}`);
    if (s.tool === 'logcat') {
      lines.push('', `Recognised entries: ${s.parsed_records}; source lines: ${s.physical_lines}; unparsed lines: ${s.unparsed_lines}.`, '', '## Log priorities', '');
      for (const [level, count] of Object.entries(s.levels)) lines.push(`- ${level}: ${count}`);
      lines.push('', '## Finding groups', '', `Includes ${s.findings.length} of ${s.finding_groups} groups. Raw log lines are not included in this summary.`, '');
      for (const f of s.findings) lines.push(`### ${f.label} · ${f.count} occurrence(s)`, '', block(`${f.process}\n${f.title}`), '', `Source line: ${f.line}.`, '', f.action, '');
      lines.push('## Repeated warnings and errors', '', `Includes ${s.repeated.length} of ${s.repeated_groups} message groups.`, '');
      for (const r of s.repeated) lines.push(`- ${r.count} × ${r.level}; source line ${r.line}`, '', block(`${r.tag}: ${r.message}`), '');
    } else {
      lines.push('', '## Java crashes', '');
      for (const r of s.java_crashes) lines.push(block(`${r.process}: ${r.summary}\n${r.detail}`), '');
      lines.push('## ANRs', ''); for (const r of s.anrs) lines.push(block(`${r.process}: ${r.detail || ''}`), '');
      lines.push('## Native crashes', ''); for (const r of s.native_crashes) lines.push(block(`${r.cmdline} (PID ${r.pid}) ${r.signal}\n${r.abort_message || r.detail || ''}\n${(r.backtrace || []).map(f => `${f.path} ${f.symbol || ''}`).join('\n')}`), '');
      lines.push('## Battery / wakelocks', '', s.battery_diagnosis.headline, '');
      for (const w of s.wakelocks) lines.push(block(`${w.name}: ${w.realtime}, ${w.times} acquisitions; ${w.reason}`), '');
      lines.push('## App access', '', s.stalkerware_indicators.note, '');
      for (const p of s.stalkerware_indicators.contributors) lines.push(block(`${p.package}\n${p.flags.map(f => f.detail).join('\n')}`), '');
      lines.push('## Device metadata', '', block(JSON.stringify(s.device || {}, null, 2)), '', '## Coverage', '', block(JSON.stringify(s.coverage || {}, null, 2)), '', '## Output limits', '', block(JSON.stringify(s.limits || {}, null, 2)), '');
    }
    lines.push('## Notes', '', ...(s.notes || []).map(n => `- ${n}`));
    return lines.join('\n');
  }

  function historyEntries() {
    try {
      let value = JSON.parse(localStorage.getItem(historyKey) || '[]');
      if (Array.isArray(value) && !value.length) {
        const legacy = JSON.parse(localStorage.getItem('bugreport_analyzer_history_v1') || '[]');
        if (Array.isArray(legacy)) value = legacy.filter(e => e?.summary?.counts && e.summary.battery_diagnosis && e.summary.crash_diagnosis && e.summary.stalkerware_indicators).map(e => ({ ...e, summary: { ...e.summary, tool: 'bugreport', coverage: { sectioned: e.summary.sections_found?.[0] !== 'FULL_TEXT', battery: Boolean(e.summary.wakelocks?.length), packages: Boolean(e.summary.stalkerware_indicators.contributors?.length) }, notes: ['Saved by the previous analyser. Reopen the capture to refresh coverage and run the updated checks.'] } }));
      }
      const valid = Array.isArray(value) ? value.filter(e => e?.summary && typeof e.summary.source_file === 'string' && e.summary.counts && Object.keys(titles).includes(e.summary.tool) && (e.summary.tool !== 'packages' || PackageAnalysis.isSummary(e.summary))) : [];
      return valid.slice(0, 10).map(entry => entry.summary.tool === 'packages' ? { ...entry, summary: PackageAnalysis.withOrigins(entry.summary) } : entry);
    } catch (_) { return []; }
  }
  function remember(summary) {
    const entries = historyEntries();
    entries.unshift({ savedAt: new Date().toISOString(), summary });
    let keep = entries.slice(0, 10);
    while (keep.length) {
      try { localStorage.setItem(historyKey, JSON.stringify(keep)); return; }
      catch (_) { keep.pop(); }
    }
    toast('The analysis finished, but this browser could not save its summary. Download JSON to keep it.');
  }
  function showHistory() {
    const entries = historyEntries();
    $('history-list').innerHTML = entries.length ? entries.map((e, i) => `<div class="history-entry"><div><strong>${escapeHTML(e.summary.source_file)}</strong><p>${escapeHTML(titles[e.summary.tool])} · ${escapeHTML(new Date(e.savedAt).toLocaleString())}</p></div><button class="button small" data-history="${i}">Open summary</button></div>`).join('') : empty('No saved analyses yet. Enable “Remember analysis summaries” before opening a file.');
    $('history-clear').disabled = !entries.length;
    if (!$('history-dialog').open) $('history-dialog').showModal();
  }

  function demo(tool) {
    if (tool === 'packages') {
      const inventory = [
        { name: 'com.example.system', uid: 10001, system: true, third_party: false, disabled: false, installer: 'null', files: [{ path: '/system/app/Example/base.apk', sha256: 'a'.repeat(64), verified_certificate: false, trusted_certificate: false }] },
        { name: 'com.example.reader', uid: 10002, system: false, third_party: true, disabled: false, installer: 'com.example.store', files: [{ path: '/data/app/com.example.reader/base.apk', sha256: 'b'.repeat(64), verified_certificate: false }] },
        { name: 'com.example.notes', uid: 10003, system: false, third_party: true, disabled: true, installer: null, files: [{ path: '/data/app/com.example.notes/base.apk', sha256: 'c'.repeat(64), certificate_error: 'Certificate data was not collected.' }] },
      ];
      openFile(tool, new File([JSON.stringify(inventory)], 'sample-packages.json', { type: 'application/json' }));
      return;
    }
    const sample = [
      '--------- beginning of main',
      '09-18 10:22:01.010 1200 1200 I ActivityManager: Started demo application',
      '09-18 10:22:02.114 4312 4312 E AndroidRuntime: FATAL EXCEPTION: main',
      '09-18 10:22:02.115 1200 1300 I ActivityManager: Background maintenance',
      '09-18 10:22:02.116 4312 4312 E AndroidRuntime: Process: com.example.demo, PID: 4312',
      '09-18 10:22:02.117 4312 4312 E AndroidRuntime: java.lang.RuntimeException: Unable to start activity',
      '09-18 10:22:02.118 4312 4312 E AndroidRuntime: Caused by: java.lang.IllegalStateException: Missing account configuration',
      '09-18 10:22:02.119 4312 4312 E AndroidRuntime:     at com.example.demo.MainActivity.onCreate(MainActivity.kt:42)',
      '09-18 10:22:03.110 5520 5520 W NetworkClient: java.net.SocketTimeoutException: request timed out',
      '09-18 10:22:05.110 5520 5520 W NetworkClient: java.net.SocketTimeoutException: request timed out',
      '09-18 10:22:07.110 5520 5520 W NetworkClient: java.net.SocketTimeoutException: request timed out',
      '09-18 10:22:08.140 6200 6200 I Choreographer: Skipped 48 frames! The application may be doing too much work on its main thread.',
      '09-18 10:22:09.140 1200 1200 E ActivityManager: ANR in com.example.reader (com.example.reader/.MainActivity)',
      '--------- beginning of crash',
      '09-18 10:22:10.201 7600 7600 F libc: Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid 7600 (demo), pid 7600 (com.example.native)',
      ''
    ].join('\n');
    const bug = `------ SYSTEM PROPERTIES ------\n[ro.product.manufacturer]: [Example]\n[ro.product.model]: [Demo device]\n[ro.build.version.release]: [15]\n[ro.build.version.sdk]: [35]\n------ SYSTEM LOG ------\n${sample}\n------ BATTERY STATS ------\nDUMP OF SERVICE batterystats:\nTime on battery: 2h 0m 0s realtime\nKernel Wakelock PowerManagerService: 12m 0s (4 times) realtime\n`;
    openFile(tool, new File([tool === 'logcat' ? sample : bug], tool === 'logcat' ? 'sample-logcat.txt' : 'sample-bugreport.txt', { type: 'text/plain' }));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    const d = button.dataset;
    if (d.route) navigate(d.route);
    if (d.browse) $(`${d.browse}-file`).click();
    if (d.demo) demo(d.demo);
    if (d.cancel) { reset(d.cancel); toast('Analysis cancelled.'); }
    if (d.reset) { reset(d.reset); $(`${d.reset}-upload`).querySelector('button').focus(); }
    if (d.entry) {
      const tool = d.entry; $(`${tool}-archive`).hidden = true; setBusy(tool, true);
      state[tool].worker?.postMessage({ type: 'entry', name: $(`${tool}-entry`).value });
    }
    if (d.tab) { state[d.tool].tab = d.tab; renderResult(d.tool); document.querySelector(`.tab.active[data-tool="${d.tool}"]`)?.focus({ preventScroll: true }); }
    if (d.tag) { state.logcat.filters = { tag: d.tag }; state.logcat.page = 0; state.logcat.tab = 'explorer'; renderResult('logcat'); }
    if (d.context) openContext(d.tool, Number(d.context));
    if (d.package != null) PackagesView.showDetails(state.packages.summary, d.package, packageUI);
    if (d.close) $(d.close).close();
    if (d.download) {
      const s = state[d.download].summary; if (!s) return;
      const json = d.format === 'json';
      download(new Blob([json ? JSON.stringify(s, null, 2) : markdown(s)], { type: json ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' }), `${d.download}-analysis.${json ? 'json' : 'md'}`);
    }
    if (d.history != null) {
      const entry = historyEntries()[Number(d.history)]; if (!entry) return;
      try { const tool = entry.summary.tool; reset(tool); state[tool].summary = entry.summary; renderResult(tool); navigate(tool); $('history-dialog').close(); }
      catch (_) { toast('This saved summary is incompatible. Reopen its source file.'); }
    }
  });
  $('history-open').onclick = showHistory;
  $('history-clear').onclick = () => { try { localStorage.removeItem(historyKey); localStorage.removeItem('bugreport_analyzer_history_v1'); showHistory(); toast('Saved summaries cleared.'); } catch (_) { toast('This browser blocked changes to saved history.'); } };
  $('context-before').onclick = () => openContext(contextTool, Math.max(1, contextTarget - 40));
  $('context-after').onclick = () => openContext(contextTool, contextTarget + 40);
  $('context-dialog').addEventListener('close', () => {
    if ($('context-dialog').open) return;
    contextTool = null;
    contextRequestId++;
  });
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  window.addEventListener('beforeunload', () => { for (const tool of Object.keys(titles)) state[tool].worker?.terminate(); });
  document.addEventListener('dragover', event => event.preventDefault());
  document.addEventListener('drop', event => event.preventDefault());
  for (const tool of Object.keys(titles)) renderTool(tool);
  navigate(location.hash.slice(1));
})();

// Analyses inventory evidence only. It does not read APKs or perform reputation lookups.
const PackageAnalysis = (() => {
  'use strict';
  const VERSION = 1;
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
    return {
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
    };
  }

  function matches(pkg, filters = {}) {
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
    if (`${pkg.name} ${pkg.uid ?? ''} ${pkg.installer ?? ''}`.toLowerCase().includes(query)) return true;
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
    if (!isObject(value) || value.tool !== 'packages' || value.version !== VERSION || !isObject(value.counts)) return false;
    if (!Array.isArray(value.packages) || value.packages.length > AnalysisConfig.MAX_PACKAGES || !Array.isArray(value.installers) || !Array.isArray(value.notes)) return false;
    return value.packages.every(pkg => isObject(pkg) && typeof pkg.name === 'string' && Number.isSafeInteger(pkg.source_index) && Array.isArray(pkg.files) && Array.isArray(pkg.findings) && pkg.files.every(isObject) && pkg.findings.every(isObject)) && value.installers.every(row => Array.isArray(row) && row.length === 2);
  }

  return { analyse, matches, page, isSummary };
})();

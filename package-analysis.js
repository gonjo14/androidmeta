const PackageAnalysis = (() => {
  'use strict';
  const VERSION = 3;
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isHash = value => /^[a-f0-9]{64}$/i.test(value || '');

  // Metadata is optional. Keep each field's provenance, including imported data.
  function metadata(value, evidence, source, kind = 'inventory') {
    const aliases = {
      label: ['label', 'app_label', 'appLabel', 'applicationLabel', 'application_label', 'app_name', 'applicationInfo.label', 'applicationInfo.nonLocalizedLabel', 'packageInfo.applicationInfo.label', 'packageInfo.applicationInfo.nonLocalizedLabel'],
      version_name: ['version_name', 'versionName', 'packageInfo.versionName'],
      version_code: ['longVersionCode', 'version_code', 'versionCode', 'packageInfo.longVersionCode', 'packageInfo.versionCode'],
    };
    const result = { label: null, version_name: null, version_code: null };
    for (const [field, keys] of Object.entries(aliases)) {
      for (const key of keys) {
        let item = value;
        for (const part of key.split('.')) item = isObject(item) && Object.hasOwn(item, part) ? item[part] : null;
        if (item == null || item === '' || (typeof item === 'string' && /^(?:null|undefined)?$/i.test(item.trim()))) continue;
        const path = `${evidence}.${key}`;
        if (field === 'version_code') {
          if (!(typeof item === 'string' && /^\d+$/.test(item.trim())) && !(Number.isSafeInteger(item) && item >= 0)) {
            throw new Error(`${path} must be a non-negative safe integer or decimal string. Use a string for large Android version codes.`);
          }
          item = String(item).trim().replace(/^0+(?=\d)/, '');
        } else {
          if (typeof item !== 'string') throw new Error(`${path} must be a string or null.`);
          item = item.trim();
        }
        if (item.length > 1024) throw new Error(`${path} is too long.`);
        result[field] = { value: item, source_file: source, evidence: path, kind };
        break;
      }
    }
    return result;
  }

  function configuration(token) {
    const cpu = { arm64_v8a: 'ARM 64-bit', armeabi_v7a: 'ARM 32-bit', armeabi: 'ARM', x86: 'x86', x86_64: 'x86 64-bit', riscv64: 'RISC-V 64-bit' };
    if (cpu[token]) return { role: 'cpu', label: `CPU split · ${cpu[token]}`, explanation: 'Native code for a CPU architecture.' };
    if (/^(?:ldpi|mdpi|tvdpi|hdpi|xhdpi|xxhdpi|xxxhdpi|\d+dpi)$/.test(token)) return { role: 'density', label: `Display split · ${token}`, explanation: 'Resources for a screen pixel density.' };
    if (/^[a-z]{2,3}(?:[_-](?:r)?[A-Z]{2})?$/.test(token) || /^b\+[a-z]{2,3}(?:\+[A-Za-z0-9]+)+$/.test(token)) {
      const locale = token.replace(/^b\+/, '').replace(/\+/g, '-').replace(/[_-]r?([A-Z]{2})$/, '-$1');
      let language = locale;
      try { language = new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) || locale; } catch (_) { /* Retain the recorded qualifier. */ }
      return { role: 'language', label: `Language split · ${language}`, explanation: `Language resources (${token}).` };
    }
    return { role: 'configuration', label: `Configuration split · ${token}`, explanation: 'A device or feature configuration; the qualifier is not classified.' };
  }

  function groupFiles(files) {
    const basename = file => (file.path || file.local_name || '').split(/[\\/]/).pop();
    const location = file => (file.path || file.local_name || '').replace(/[^\\/]*$/, '');
    const names = files.map(basename);
    const roles = files.map((file, index) => {
      const filename = names[index];
      let role;
      if (filename === 'base.apk') role = { role: 'base', label: 'Base APK', explanation: 'The main app package.' };
      const config = /^(?:split_)?(?:(.+)\.)?config\.(.+)\.apk$/.exec(filename);
      if (!role && config) role = { ...configuration(config[2]), module: config[1] || null };
      if (!role && /^split_.+\.apk$/.test(filename)) role = { role: 'feature', label: `Feature split · ${filename.slice(6, -4)}`, explanation: 'Additional app functionality or a code module.' };
      // Preinstalled apps often use App-arm64_v8a.apk / App-xhdpi.apk.
      // Only infer this convention when the matching App.apk is a sibling.
      const oem = /^(.+)-([^/]+)\.apk$/.exec(filename);
      if (!role && oem && files.some((other, i) => i !== index && names[i] === `${oem[1]}.apk` && location(other) === location(file))) {
        const candidate = configuration(oem[2]);
        if (candidate.role !== 'configuration') role = candidate;
      }
      if (!role && filename.endsWith('.apk') && files.some((other, i) => i !== index && location(other) === location(file) && names[i].startsWith(`${filename.slice(0, -4)}-`) && configuration(names[i].slice(filename.length - 3, -4)).role !== 'configuration')) {
        role = { role: 'base', label: 'Base APK', explanation: 'Main APK inferred from matching configuration filenames.' };
      }
      if (!role) role = files.length === 1 && filename.endsWith('.apk')
        ? { role: 'standalone', label: 'Single APK', explanation: 'One APK file was supplied for this package.' }
        : { role: 'unknown', label: 'Role not established', explanation: 'The filename does not establish whether this is a base or split APK.' };
      return { ...file, apk: { ...role, filename: filename || 'Filename not recorded', basis: 'filename-inference' } };
    });
    const count = role => roles.filter(file => file.apk.role === role).length;
    const baseCount = count('base'), unknownCount = count('unknown');
    const splitCount = roles.filter(file => ['cpu', 'density', 'language', 'configuration', 'feature'].includes(file.apk.role)).length;
    const status = !files.length ? 'empty' : splitCount ? 'split' : files.length > 1 ? 'multiple' : 'single';
    const parts = [];
    if (baseCount) parts.push(`${baseCount} base`);
    if (splitCount) parts.push(`${splitCount} split${splitCount === 1 ? '' : 's'}`);
    if (unknownCount) parts.push(`${unknownCount} unclassified`);
    return { files: roles, apk_group: {
      status, file_count: files.length, base_count: baseCount, split_count: splitCount, unknown_count: unknownCount,
      summary: parts.join(' + ') || (files.length === 1 ? 'Single APK' : 'No APK files'),
      explanation: status === 'split'
        ? 'These files belong to one package record. Android can separate the main app, language resources, CPU code, display resources, and optional features into APKs. Multiple files alone are not a suspicious finding.'
        : status === 'multiple' ? 'These files belong to one package record. Their filenames do not establish a split-APK layout; multiple files alone are not a suspicious finding.'
        : status === 'single' ? 'The collector supplied one APK file for this package.' : 'The collector supplied no APK files.',
      note: 'File roles are inferred from filenames. Manifests, split dependencies, completeness, and signatures have not been verified.',
    } };
  }

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

  function normalizePackage(value, index, source) {
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
      metadata: metadata(value, evidence, source),
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
    const packages = input.map((value, index) => normalizePackage(value, index, source));
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
        'Labels and versions are shown only when supplied by the collector or a separate metadata file. Catalogue names are labelled fallbacks and may differ from the installed app label.',
        'Each package record groups its APK files. Base and split roles are filename inferences; multiple files alone do not indicate a problem.',
        'Permissions, accessibility status, install times, and behaviour are not available in this schema.',
      ],
      limits: { package_records: AnalysisConfig.MAX_PACKAGES, apk_files: AnalysisConfig.MAX_PACKAGE_FILES, file_bytes: AnalysisConfig.MAX_PACKAGE_BYTES },
    });
  }

  // Refresh saved v1/v2/v3 reports against the shipped catalogue without changing
  // their capture date or mutating the original evidence.
  function withOrigins(summary) {
    const packages = summary.packages.map(pkg => {
      const origin = PackageOrigins.lookup(pkg.name, pkg);
      const fields = pkg.metadata || { label: null, version_name: null, version_code: null };
      const label = fields.label?.value;
      return { ...pkg, ...groupFiles(pkg.files), metadata: fields, origin,
        display_name: label || origin.app_name || pkg.name,
        display_name_source: label ? fields.label.kind : origin.app_name ? 'catalogue' : 'package-id',
      };
    });
    const counts = { ...summary.counts, china_linked: 0, china_publisher: 0, origin_needs_review: 0, origin_publisher_recorded: 0, origin_publisher_hint: 0, origin_unclassified: 0,
      multi_file_packages: 0, split_packages: 0, apk_splits: 0, labels_recorded: 0, catalogue_names: 0, version_names_recorded: 0, version_codes_recorded: 0 };
    for (const pkg of packages) {
      if (pkg.files.length > 1) counts.multi_file_packages++;
      if (pkg.apk_group.status === 'split') counts.split_packages++;
      counts.apk_splits += pkg.apk_group.split_count;
      if (pkg.metadata.label) counts.labels_recorded++;
      if (pkg.display_name_source === 'catalogue') counts.catalogue_names++;
      if (pkg.metadata.version_name) counts.version_names_recorded++;
      if (pkg.metadata.version_code) counts.version_codes_recorded++;
      if (pkg.origin.status === 'china-linked') counts.china_linked++;
      if (pkg.origin.basis === 'china-publisher') counts.china_publisher++;
      if (pkg.origin.status === 'needs-review') counts.origin_needs_review++;
      if (pkg.origin.status === 'publisher-recorded') counts.origin_publisher_recorded++;
      if (pkg.origin.status === 'publisher-hint') counts.origin_publisher_hint++;
      if (pkg.origin.status === 'unclassified') counts.origin_unclassified++;
    }
    const notes = summary.notes.map(note => note.replace('Permissions, accessibility status, version numbers, install times, and behaviour are not available in this schema.', 'Permissions, accessibility status, install times, and behaviour are not available in this schema.'));
    return { ...summary, version: VERSION, packages, counts, notes, origin_catalogue: PackageOrigins.metadata() };
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
    if (filters.layout === 'multiple' && pkg.files.length < 2) return false;
    if (filters.layout === 'split' && pkg.apk_group?.status !== 'split') return false;
    if (filters.layout === 'single' && pkg.files.length !== 1) return false;
    if (filters.layout === 'unclassified' && !pkg.apk_group?.unknown_count) return false;
    if (filters.layout === 'empty' && pkg.files.length) return false;
    const query = (filters.query || '').trim().toLowerCase();
    if (!query) return true;
    if (`${pkg.name} ${pkg.display_name ?? ''} ${pkg.metadata?.version_name?.value ?? ''} ${pkg.metadata?.version_code?.value ?? ''} ${pkg.uid ?? ''} ${pkg.installer ?? ''} ${origin.app_name ?? ''} ${origin.publisher ?? ''} ${origin.publisher_hint ?? ''} ${origin.group ?? ''}`.toLowerCase().includes(query)) return true;
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
    if (!isObject(value) || value.tool !== 'packages' || ![1, 2, VERSION].includes(value.version) || !isObject(value.counts)) return false;
    if (!Array.isArray(value.packages) || value.packages.length > AnalysisConfig.MAX_PACKAGES || !Array.isArray(value.installers) || !Array.isArray(value.notes)) return false;
    return value.packages.every(pkg => isObject(pkg) && typeof pkg.name === 'string' && Number.isSafeInteger(pkg.source_index) && Array.isArray(pkg.files) && Array.isArray(pkg.findings) && pkg.files.every(isObject) && pkg.findings.every(isObject)) && value.installers.every(row => Array.isArray(row) && row.length === 2);
  }

  function filteredReport(summary, filters = {}) {
    const selection = Object.fromEntries(['query', 'type', 'disabled', 'installer', 'review', 'origin', 'layout'].map(key => [key, typeof filters[key] === 'string' ? filters[key] : '']));
    const packages = summary.packages.filter(pkg => matches(pkg, selection));
    return {
      tool: 'packages-filtered', version: 2, source_file: summary.source_file,
      analyzed_at: summary.analyzed_at, exported_at: new Date().toISOString(),
      inventory_packages: summary.packages.length, matching_packages: packages.length,
      filters: selection, origin_catalogue: summary.origin_catalogue, metadata_import: summary.metadata_import || null,
      notes: summary.notes, packages,
    };
  }

  function parseMetadata(text, source) {
    const clean = text.replace(/^\uFEFF/, '').trim();
    if (!clean) throw new Error('The app metadata file is empty.');
    const rows = [];
    const add = (value, evidence) => {
      if (!isObject(value)) throw new Error(`${evidence} must be a metadata object.`);
      const name = string(value.name ?? value.packageName ?? value.package_name, `${evidence}.name`);
      if (!name) throw new Error(`${evidence} needs a package name.`);
      const uid = value.uid ?? null;
      if (uid !== null && (!Number.isSafeInteger(uid) || uid < 0)) throw new Error(`${evidence}.uid must be a non-negative integer.`);
      const fields = metadata(value, evidence, source, 'import');
      if (Object.values(fields).some(Boolean)) rows.push({ name, uid, metadata: fields });
      if (rows.length > AnalysisConfig.MAX_PACKAGES) throw new Error('Too many metadata package records.');
    };
    if (/^[\[{]/.test(clean)) {
      let input;
      try { input = JSON.parse(clean); } catch (_) { throw new Error('Invalid metadata JSON.'); }
      if (Array.isArray(input)) input.forEach((row, i) => add(row, `$[${i}]`));
      else if (isObject(input) && Array.isArray(input.packages)) input.packages.forEach((row, i) => add(row, `$.packages[${i}]`));
      else if (isObject(input)) Object.entries(input).forEach(([name, row]) => {
        if (!isObject(row)) throw new Error('Use a package array or an object keyed by package ID.');
        if (row.name != null && row.name !== name) throw new Error(`Metadata key ${name} conflicts with its name field.`);
        add({ ...row, name }, `$[${JSON.stringify(name)}]`);
      });
      else throw new Error('Use a package array or an object keyed by package ID.');
    } else {
      // Only top-level package fields in the active Packages section are used.
      // Activity/service labels and hidden factory versions are not app metadata.
      let active = !/^Packages:\s*$/m.test(text), current = null, indent = 0;
      const flush = () => {
        if (!current) return;
        const before = rows.length;
        add(current.value, `package at line ${current.line}`);
        if (rows.length > before) for (const [key, line] of Object.entries(current.lines)) {
          if (rows[before].metadata[key]) rows[before].metadata[key].evidence = `line ${line}`;
        }
        current = null;
      };
      for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (/^Packages:\s*$/.test(line)) { flush(); active = true; continue; }
        if (/^\S/.test(line) && !/^Package \[/.test(line)) { flush(); active = false; continue; }
        const header = /^(\s*)Package \[([^\]]+)\].*:\s*$/.exec(line);
        if (header) {
          flush();
          if (active) { current = { value: { name: header[2] }, line: index + 1, lines: {} }; indent = header[1].length + 2; }
          continue;
        }
        if (!active || !current || line.length - line.trimStart().length !== indent) continue;
        const code = /^\s*versionCode=(\d+)\b/.exec(line);
        const version = /^\s*versionName=(.*)$/.exec(line);
        const label = /^\s*(?:applicationLabel|label|nonLocalizedLabel)=(.*)$/.exec(line);
        if (code) { current.value.versionCode = code[1]; current.lines.version_code = index + 1; }
        if (version) { current.value.versionName = version[1].trim(); current.lines.version_name = index + 1; }
        if (label) { current.value.label = label[1].trim().replace(/^(?:"(.*)"|'(.*)')$/, '$1$2'); current.lines.label = index + 1; }
      }
      flush();
    }
    if (!rows.length) throw new Error('No app labels or versions were found. Use collector metadata JSON or text from adb shell dumpsys package.');
    return rows;
  }

  function enrich(summary, text, source = 'app-metadata.json') {
    if (!isSummary(summary)) throw new Error('Open a package inventory before adding app details.');
    const rows = parseMetadata(text, source), byName = new Map();
    for (const row of rows) { if (!byName.has(row.name)) byName.set(row.name, []); byName.get(row.name).push(row); }
    const nameCounts = new Map();
    for (const pkg of summary.packages) nameCounts.set(pkg.name, (nameCounts.get(pkg.name) || 0) + 1);
    const info = { source_file: source, imported_at: new Date().toISOString(), metadata_records: rows.length, matched_packages: 0, updated_packages: 0, unmatched_records: 0, conflict_fields: 0, ambiguous_packages: 0 };
    const matched = new Set();
    const packages = summary.packages.map(pkg => {
      const candidates = (byName.get(pkg.name) || []).filter(row => row.uid === null || row.uid === pkg.uid);
      if (!candidates.length) return pkg;
      if (nameCounts.get(pkg.name) > 1 && candidates.some(row => row.uid === null)) { info.ambiguous_packages++; return pkg; }
      candidates.forEach(row => matched.add(row)); info.matched_packages++;
      const fields = { label: null, version_name: null, version_code: null, ...pkg.metadata };
      const conflicts = [];
      let changed = false;
      // Version name and code must describe the same release. If either
      // disagrees, do not combine one source's name with another source's code.
      const conflictingVersion = ['version_name', 'version_code'].some(key => {
        const values = new Set(candidates.map(row => row.metadata[key]?.value).filter(value => value != null));
        return values.size > 1 || (values.size && fields[key] && !values.has(fields[key].value));
      });
      for (const key of ['label', 'version_name', 'version_code']) {
        const supplied = candidates.map(row => row.metadata[key]).filter(Boolean);
        const values = new Set(supplied.map(field => field.value));
        if (!values.size) continue;
        if (values.size > 1 || (fields[key] && !values.has(fields[key].value)) || (key.startsWith('version_') && conflictingVersion)) {
          info.conflict_fields++; conflicts.push({ field: key, retained: fields[key], supplied }); continue;
        }
        if (!fields[key]) { fields[key] = supplied[0]; changed = true; }
      }
      if (changed) info.updated_packages++;
      return { ...pkg, metadata: fields, metadata_conflicts: [...(pkg.metadata_conflicts || []), ...conflicts] };
    });
    info.unmatched_records = rows.filter(row => !matched.has(row)).length;
    return withOrigins({ ...summary, packages, metadata_import: info });
  }

  return { analyse, matches, page, isSummary, withOrigins, filteredReport, parseMetadata, enrich };
})();

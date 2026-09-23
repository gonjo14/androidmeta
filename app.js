'use strict';
// Shared by the UI and worker. The build includes this file in both contexts.
const AnalysisConfig = Object.freeze({
  ASSET_VERSION: '0.5.4',
  MAX_FILE_BYTES: 350 * 1024 * 1024,
  FILE_LIMIT_LABEL: '350 MiB',
  MAX_LINES: 20_000_000,
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
  MAX_SETTINGS_BYTES: 2 * 1024 * 1024,
  SETTINGS_LIMIT_LABEL: '2 MiB per file',
  MAX_SETTINGS_RECORDS: 20_000,
  MAX_SETTINGS_LINES: 25_000,
  MAX_SETTING_LINE_CHARS: 100_000,
  SETTINGS_PAGE_SIZE: 50,
  MAX_GETPROP_BYTES: 2 * 1024 * 1024,
  GETPROP_LIMIT_LABEL: '2 MiB',
  MAX_GETPROP_RECORDS: 20_000,
  MAX_GETPROP_LINES: 25_000,
  MAX_GETPROP_RECORD_CHARS: 100_000,
  GETPROP_PAGE_SIZE: 50,
});

// Metadata checks must run before reading bytes, on both sides of the worker.
function validateCapture(file, tool = 'logcat') {
  if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0) {
    return 'Choose a valid file from your device.';
  }
  if (file.size === 0) return 'This file is empty. Choose a capture with data.';
  const packages = tool === 'packages';
  const settings = tool === 'settings';
  const properties = tool === 'getprop';
  const limit = properties ? AnalysisConfig.MAX_GETPROP_BYTES : settings ? AnalysisConfig.MAX_SETTINGS_BYTES : packages ? AnalysisConfig.MAX_PACKAGE_BYTES : AnalysisConfig.MAX_FILE_BYTES;
  const label = properties ? AnalysisConfig.GETPROP_LIMIT_LABEL : settings ? AnalysisConfig.SETTINGS_LIMIT_LABEL : packages ? AnalysisConfig.PACKAGE_LIMIT_LABEL : AnalysisConfig.FILE_LIMIT_LABEL;
  if (file.size > limit) {
    return `This file exceeds the ${label} limit. Choose a smaller capture.`;
  }
  if (packages) return /\.json$/i.test(file.name) ? null : 'Choose a packages.json inventory file.';
  if (properties) return /\.txt$/i.test(file.name) ? null : 'Choose a getprop text export (.txt).';
  if (settings) return /\.txt$/i.test(file.name) ? null : 'Choose a settings_global.txt, settings_secure.txt, or settings_system.txt export.';
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
// PackageAnalysis is loaded from package-analysis.js.

;
// Read-only inspection of `adb shell settings list <namespace>` exports.
const SettingsAnalysis = (() => {
  'use strict';
  const VERSION = 1;
  const namespaces = ['global', 'secure', 'system'];
  const catalogue = new Map();
  const api = (namespace, anchor) => `https://developer.android.com/reference/android/provider/Settings.${namespace[0].toUpperCase() + namespace.slice(1)}#${anchor}`;
  const wifiSource = 'https://android.googlesource.com/platform/packages/apps/Settings/+/master/src/com/android/settings/development/WirelessDebuggingEnabler.java';
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function add(namespace, key, label, category, type, extra = {}) {
    catalogue.set(`${namespace}:${key}`, { label, category, type, source: api(namespace, key.toUpperCase()), ...extra });
  }
  for (const [key, label, category] of [
    ['adb_enabled', 'USB debugging', 'Development'],
    ['development_settings_enabled', 'Developer options', 'Development'],
    ['wait_for_debugger', 'Wait for debugger', 'Development'],
    ['always_finish_activities', 'Finish activities immediately', 'Development'],
    ['airplane_mode_on', 'Airplane mode', 'Connectivity'],
    ['bluetooth_on', 'Bluetooth setting', 'Connectivity'],
    ['wifi_on', 'Wi-Fi setting', 'Connectivity'],
    ['data_roaming', 'Data roaming setting', 'Connectivity'],
    ['auto_time', 'Automatic clock setting', 'Time'],
    ['auto_time_zone', 'Automatic time-zone setting', 'Time'],
    ['device_provisioned', 'Device provisioning flag', 'Device'],
  ]) add('global', key, label, category, 'boolean');
  add('global', 'adb_wifi_enabled', 'Wireless debugging', 'Development', 'boolean', { source: wifiSource });
  add('global', 'debug_app', 'Debug target', 'Development', 'text');
  add('global', 'http_proxy', 'HTTP proxy setting', 'Connectivity', 'text');
  add('global', 'boot_count', 'Recorded boot count', 'Device', 'integer');
  add('global', 'stay_on_while_plugged_in', 'Keep awake while charging', 'Power', 'charging-mask');
  for (const key of ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']) {
    add('global', key, key.replace(/_/g, ' '), 'Display', 'scale');
  }
  for (const [key, label, category] of [
    ['accessibility_enabled', 'Accessibility setting', 'Accessibility'],
    ['touch_exploration_enabled', 'Touch exploration', 'Accessibility'],
    ['accessibility_display_inversion_enabled', 'Colour inversion', 'Accessibility'],
  ]) add('secure', key, label, category, 'boolean');
  add('secure', 'android_id', 'Android identifier', 'Device', 'text', { note: 'Identifier scope varies by Android version, user, and signing identity.' });
  add('secure', 'default_input_method', 'Default input method', 'Input', 'text');
  add('secure', 'enabled_input_methods', 'Enabled input method records', 'Input', 'text');
  add('secure', 'enabled_accessibility_services', 'Accessibility service records', 'Accessibility', 'text', { note: 'A stored list does not prove a service is currently running.' });
  add('secure', 'location_mode', 'Legacy location mode', 'Location', 'legacy-location', { legacy: true, note: 'Deprecated since API 28; this export alone does not establish current location behaviour.' });
  add('secure', 'install_non_market_apps', 'Legacy external-install flag', 'Privacy & access', 'boolean', { legacy: true, note: 'Deprecated since API 26. Current install permission is per app and is not established here.' });
  add('secure', 'mock_location', 'Legacy mock-location flag', 'Location', 'boolean', { source: api('secure', 'ALLOW_MOCK_LOCATION'), legacy: true, note: 'Unused since API 23; this does not identify a current mock-location app.' });
  for (const [key, label, category] of [
    ['accelerometer_rotation', 'Automatic rotation', 'Display'],
    ['sound_effects_enabled', 'Touch sounds', 'Sound'],
  ]) add('system', key, label, category, 'boolean');
  add('system', 'dtmf_tone', 'Dial-pad tones', 'Sound', 'boolean', { source: api('system', 'DTMF_TONE_WHEN_DIALING') });
  add('system', 'haptic_feedback_enabled', 'Haptic feedback', 'Sound', 'boolean', { legacy: true, note: 'Deprecated since API 33; the vibration service applies user preferences.' });
  add('system', 'vibrate_when_ringing', 'Vibrate when ringing', 'Sound', 'boolean', { legacy: true, note: 'Deprecated since API 33; the vibration service applies user preferences for incoming calls.' });
  add('system', 'screen_brightness_mode', 'Brightness mode', 'Display', 'brightness-mode');
  add('system', 'screen_brightness', 'Stored brightness level', 'Display', 'integer', { note: 'A stored value, not a live brightness measurement. Device scaling can differ.' });
  add('system', 'screen_off_timeout', 'Inactivity timeout', 'Display', 'milliseconds', { note: 'Device policy and other features can affect the actual sleep or lock time.' });
  add('system', 'font_scale', 'Font-size preference', 'Display', 'positive-scale', { note: 'This preference does not measure the rendered text size.' });
  add('system', 'user_rotation', 'Stored rotation lock', 'Display', 'rotation', { note: 'Interpret with the automatic-rotation setting; this is not measured orientation.' });

  function namespaceForFile(name) {
    if (typeof name !== 'string') return null;
    return /^(?:settings[_-])?(global|secure|system)(?:[ _-]?\(\d+\))?\.txt$/i.exec(name)?.[1].toLowerCase() || null;
  }
  function validateFiles(files) {
    if (!Array.isArray(files) || files.length < 1 || files.length > 3) return 'Choose one to three settings exports, one per namespace.';
    const seen = new Set();
    for (const file of files) {
      const error = validateCapture(file, 'settings');
      if (error) return error;
      const namespace = namespaceForFile(file.name);
      if (!namespace) return 'Name the files settings_global.txt, settings_secure.txt, or settings_system.txt so their namespaces can be identified.';
      if (seen.has(namespace)) return `Choose only one ${namespace} export in this selection.`;
      seen.add(namespace);
    }
    return null;
  }

  function categoryHint(key) {
    // Browsing hints only: matching a name does not give a value a meaning.
    if (/adb|debug|development/.test(key)) return 'Development';
    if (/accessibility|touch_exploration/.test(key)) return 'Accessibility';
    if (/location|gps|gnss/.test(key)) return 'Location';
    if (/wifi|bluetooth|mobile_data|roaming|network|airplane|tether|proxy/.test(key)) return 'Connectivity';
    if (/battery|charging|low_power|sleep|doze|power|screensaver/.test(key)) return 'Power';
    if (/screen|display|brightness|animation|font|rotation|theme|refresh_rate/.test(key)) return 'Display';
    if (/volume|sound|ringtone|audio|vibrat|haptic|dtmf/.test(key)) return 'Sound';
    if (/keyboard|input_method|spell_checker|pointer|(?:^|_)ime(?:_|$)/.test(key)) return 'Input';
    if (/notification|lock|biometric|face|trust|backup|install|verifier/.test(key)) return 'Privacy & access';
    if (/time|clock|zone/.test(key)) return 'Time';
    return 'Other';
  }

  function interpret(definition, rawValue) {
    const value = rawValue.trim();
    if (!rawValue) return { text: 'Empty recorded value', valid: true };
    if (!value) return { text: 'Whitespace-only text recorded', valid: true };
    if (value === 'null') return { text: 'Literal "null" recorded; meaning not assumed', valid: true };
    if (!definition) return { text: 'Raw value; no documented interpretation in this catalogue', valid: true };
    const result = text => ({ text, valid: true });
    const unknown = () => ({ text: 'Value outside the supported interpretation; raw value retained', valid: false });
    if (definition.type === 'text') return result('Text value recorded');
    if (definition.type === 'boolean') return value === '0' || value === '1' ? result(`${definition.legacy ? 'Legacy flag' : 'Flag'} ${value === '1' ? 'on' : 'off'} (recorded)`) : unknown();
    if (definition.type === 'legacy-location') return /^(0|1|2|3)$/.test(value) ? result(`Legacy code ${value}; current location state not established`) : unknown();
    if (definition.type === 'brightness-mode') return value === '0' ? result('Manual mode recorded') : value === '1' ? result('Automatic mode recorded') : unknown();
    if (definition.type === 'rotation') return /^[0-3]$/.test(value) ? result(`${Number(value) * 90}° lock preference recorded`) : unknown();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return unknown();
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric > Number.MAX_SAFE_INTEGER) return unknown();
    if (['integer', 'milliseconds', 'charging-mask'].includes(definition.type) && !Number.isSafeInteger(numeric)) return unknown();
    if (definition.type === 'integer') return result(`${numeric} (recorded)`);
    if (definition.type === 'milliseconds') return result(`${numeric} ms · ${numeric / 1000} seconds`);
    if (definition.type === 'positive-scale' && numeric <= 0) return unknown();
    if (definition.type === 'scale' || definition.type === 'positive-scale') return result(`${numeric}× preference${numeric === 0 ? ' · animations disabled' : ''}`);
    if (definition.type === 'charging-mask') {
      if (numeric > 15) return unknown();
      return result(numeric === 0 ? 'Keep-awake charging flag off' : `Keep awake for: ${[[1, 'AC'], [2, 'USB'], [4, 'wireless'], [8, 'dock']].filter(([bit]) => numeric & bit).map(([, name]) => name).join(', ')}`);
    }
    return unknown();
  }

  function reviewFor(namespace, key, rawValue, interpretation) {
    const value = rawValue.trim();
    if (!interpretation.valid) return 'The catalogue cannot interpret this recorded value; check the device version or vendor definition.';
    if (namespace !== 'global') return null;
    if (['adb_enabled', 'adb_wifi_enabled'].includes(key) && value === '1') return 'Debugging is enabled in the recorded settings. Review if unexpected; connected clients and authorizations are not recorded.';
    if (key === 'development_settings_enabled' && value === '1') return 'Developer options are enabled in the snapshot; this can be intentional.';
    if (key === 'wait_for_debugger' && value === '1') return 'The debugger-wait flag can affect application startup.';
    if (key === 'always_finish_activities' && value === '1') return 'Immediate activity cleanup can affect application lifecycle behaviour.';
    if (key === 'debug_app' && value && value !== 'null') return 'A debug target is recorded. Check whether it is intended.';
    if (key === 'http_proxy' && value && !['null', ':0'].includes(value)) return 'A proxy value is recorded; this file does not establish whether it is active.';
    return null;
  }

  function analyse(inputs, progress = () => {}) {
    if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 3) throw new Error('Provide one to three settings exports.');
    const records = [], files = [], issues = [], seen = new Set();
    let physicalLines = 0;
    for (const input of inputs) {
      if (!isObject(input) || !namespaces.includes(input.namespace) || typeof input.text !== 'string' || typeof input.source_file !== 'string') throw new Error('Each settings export needs a namespace, filename, and text.');
      if (seen.has(input.namespace)) throw new Error(`More than one ${input.namespace} export was supplied.`);
      seen.add(input.namespace);
      if (new TextEncoder().encode(input.text).byteLength > AnalysisConfig.MAX_SETTINGS_BYTES) throw new Error(`This settings export exceeds ${AnalysisConfig.SETTINGS_LIMIT_LABEL}.`);
      if (input.text.includes('\0')) throw new Error('Export settings as UTF-8 text; a NUL byte was found.');
      const lines = input.text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
      if (lines.at(-1) === '') lines.pop();
      physicalLines += lines.length;
      if (physicalLines > AnalysisConfig.MAX_SETTINGS_LINES) throw new Error('Too many settings lines. Split or reduce the exports.');
      let count = 0, invalid = 0;
      progress(`Reading ${input.namespace} settings…`, true);
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (line.length > AnalysisConfig.MAX_SETTING_LINE_CHARS) throw new Error(`Line ${index + 1} in ${input.source_file} is too long.`);
        if (!line.trim()) continue;
        const equal = line.indexOf('=');
        const key = equal < 0 ? '' : line.slice(0, equal).trim();
        if (!key || !/^[A-Za-z0-9_.:/-]+$/.test(key)) {
          invalid++;
          if (issues.length < 100) issues.push({ namespace: input.namespace, source_file: input.source_file, line: index + 1, message: 'Expected a setting name followed by = and its value.' });
          continue;
        }
        if (records.length >= AnalysisConfig.MAX_SETTINGS_RECORDS) throw new Error('Too many settings records. Reduce the exports.');
        // Only the first '=' separates the key. JSON, lists, URLs, and '=' in
        // values stay intact; an empty string and literal "null" are distinct.
        const value = line.slice(equal + 1);
        const definition = catalogue.get(`${input.namespace}:${key}`);
        const interpretation = interpret(definition, value);
        records.push({
          id: `${input.namespace}:${index + 1}`, namespace: input.namespace, key, value,
          source_file: input.source_file, line: index + 1,
          category: definition?.category || categoryHint(key), category_basis: definition ? 'catalogue' : 'name-hint',
          label: definition?.label || key, known: Boolean(definition), legacy: Boolean(definition?.legacy),
          interpretation: interpretation.text, note: definition?.note || null,
          source: definition?.source || null,
          review: reviewFor(input.namespace, key, value, interpretation),
          value_state: value === '' ? 'empty' : value.trim() === 'null' ? 'literal-null' : 'recorded',
          duplicate: false,
        });
        count++;
      }
      if (!count) throw new Error(`No key=value settings were found in ${input.source_file}.`);
      files.push({ namespace: input.namespace, source_file: input.source_file, records: count, physical_lines: lines.length, malformed_lines: invalid });
    }
    const frequencies = new Map();
    for (const row of records) {
      const identity = `${row.namespace}:${row.key}`;
      frequencies.set(identity, (frequencies.get(identity) || 0) + 1);
    }
    for (const row of records) row.duplicate = frequencies.get(`${row.namespace}:${row.key}`) > 1;
    return {
      tool: 'settings', version: VERSION, source_file: files.map(file => file.source_file).join(' + '), analyzed_at: new Date().toISOString(),
      files, records, issues,
      counts: {
        records: records.length, files: files.length, distinct_settings: frequencies.size,
        global: records.filter(row => row.namespace === 'global').length,
        secure: records.filter(row => row.namespace === 'secure').length,
        system: records.filter(row => row.namespace === 'system').length,
        explained: records.filter(row => row.known).length,
        raw_only: records.filter(row => !row.known).length,
        review: records.filter(row => row.review || row.duplicate).length,
        legacy: records.filter(row => row.legacy).length,
        duplicate_records: records.filter(row => row.duplicate).length,
        malformed_lines: files.reduce((sum, file) => sum + file.malformed_lines, 0),
        empty: records.filter(row => row.value_state === 'empty').length,
        literal_null: records.filter(row => row.value_state === 'literal-null').length,
      },
      notes: [
        'These are stored settings from the exports, not measurements of current device behaviour. No device settings are changed.',
        'Absent keys remain absent. Empty strings and the literal text null are preserved, not treated as disabled.',
        'The namespace and source line identify each record. Duplicate keys are retained; no winning value is chosen.',
        'Android version, device policies, user/profile, and vendor changes can affect meaning. Legacy settings do not establish current app permissions.',
        'Unexplained keys remain searchable as raw values. Their categories are name-based browsing hints, not verified interpretations.',
        'Files are combined for browsing. Their filenames do not prove that they came from the same device, user, or capture time.',
        'Downloads and optional history include the recorded values, including identifiers. No inventory or settings data is sent to a server.',
      ],
    };
  }

  function matches(row, filters = {}) {
    if (filters.namespace && row.namespace !== filters.namespace) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.status === 'review' && !(row.review || row.duplicate)) return false;
    if (filters.status === 'explained' && !row.known) return false;
    if (filters.status === 'raw' && row.known) return false;
    if (filters.status === 'legacy' && !row.legacy) return false;
    if (filters.status === 'duplicates' && !row.duplicate) return false;
    if (['empty', 'literal-null'].includes(filters.status) && row.value_state !== filters.status) return false;
    const query = String(filters.query || '').trim().toLowerCase();
    return !query || `${row.namespace} ${row.key} ${row.value} ${row.label} ${row.interpretation} ${row.note || ''}`.toLowerCase().includes(query);
  }
  function page(records, filters = {}, requested = 0) {
    const filtered = records.filter(row => matches(row, filters));
    const pages = Math.max(1, Math.ceil(filtered.length / AnalysisConfig.SETTINGS_PAGE_SIZE));
    const current = Math.min(pages - 1, Math.max(0, Math.floor(Number(requested)) || 0));
    return { total: filtered.length, page: current, pages, records: filtered.slice(current * AnalysisConfig.SETTINGS_PAGE_SIZE, (current + 1) * AnalysisConfig.SETTINGS_PAGE_SIZE) };
  }
  function filteredReport(summary, filters = {}) {
    const selection = Object.fromEntries(['query', 'namespace', 'category', 'status'].map(key => [key, typeof filters[key] === 'string' ? filters[key] : '']));
    const records = summary.records.filter(row => matches(row, selection));
    return { tool: 'settings-filtered', version: VERSION, analyzed_at: summary.analyzed_at, exported_at: new Date().toISOString(), files: summary.files, filters: selection, total_records: summary.records.length, matching_records: records.length, records, notes: summary.notes };
  }
  function isSummary(value) {
    return isObject(value) && value.tool === 'settings' && value.version === VERSION && typeof value.source_file === 'string' && isObject(value.counts)
      && Array.isArray(value.files) && value.files.length <= 3 && value.files.every(file => isObject(file) && namespaces.includes(file.namespace) && typeof file.source_file === 'string')
      && Array.isArray(value.records) && value.records.length <= AnalysisConfig.MAX_SETTINGS_RECORDS && value.records.every(row => isObject(row) && namespaces.includes(row.namespace) && ['id', 'key', 'value', 'source_file', 'label', 'category', 'interpretation'].every(key => typeof row[key] === 'string') && Number.isSafeInteger(row.line) && row.line > 0)
      && Array.isArray(value.notes) && value.notes.every(note => typeof note === 'string') && Array.isArray(value.issues) && value.issues.every(isObject);
  }
  return { namespaceForFile, validateFiles, analyse, matches, page, filteredReport, isSummary };
})();

;
// Pure, read-only analysis of the bracketed output of `adb shell getprop`.
const GetpropAnalysis = (() => {
  'use strict';
  const VERSION = 1;
  const sources = Object.freeze({
    build: 'https://android.googlesource.com/platform/frameworks/base/+/main/core/java/android/os/Build.java',
    init: 'https://android.googlesource.com/platform/system/core/+/main/init/README.md',
    boot: 'https://android.googlesource.com/platform/external/avb/+/master/README.md',
    lock: 'https://source.android.com/docs/core/architecture/bootloader/locking_unlocking',
    adb: 'https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/main/daemon/main.cpp',
    encryption: 'https://source.android.com/docs/security/features/encryption/file-based',
    usb: 'https://android.googlesource.com/platform/system/core/+/6078805/rootdir/init.usb.rc',
  });
  const catalogue = new Map();
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function add(key, label, category, type, source, extra = {}) {
    catalogue.set(key, { label, category, type, source, ...extra });
  }
  for (const [key, label, category] of [
    ['ro.product.manufacturer', 'Manufacturer', 'Device'], ['ro.product.brand', 'Brand', 'Device'],
    ['ro.product.model', 'Model', 'Device'], ['ro.product.device', 'Device codename', 'Device'],
    ['ro.product.name', 'Product name', 'Device'], ['ro.hardware', 'Hardware name', 'Device'],
    ['ro.product.cpu.abilist', 'Supported CPU ABIs', 'Device'],
    ['ro.build.id', 'Build ID', 'Build'], ['ro.build.display.id', 'Display build ID', 'Build'],
    ['ro.build.fingerprint', 'Build fingerprint', 'Build'],
    ['ro.build.version.release', 'Android release', 'Build'],
    ['ro.build.version.incremental', 'Incremental build version', 'Build'],
    ['ro.build.version.codename', 'Platform codename', 'Build'],
  ]) add(key, label, category, 'text', sources.build);
  add('ro.build.version.sdk', 'Android API level', 'Build', 'integer', sources.build);
  add('ro.build.version.security_patch', 'Reported security patch level', 'Build', 'date', sources.build, { note: 'A reported patch date does not verify installed fixes or establish the capture date.' });
  add('ro.build.type', 'Build type', 'Build', 'build-type', sources.build);
  add('ro.build.tags', 'Build tags', 'Build', 'tags', sources.build, { note: 'Build tags are text claims and do not authenticate the signing key.' });
  add('ro.boot.verifiedbootstate', 'Verified Boot state', 'Boot', 'verified-boot', sources.boot, { note: 'Reported boot state only; this text export is not hardware attestation.' });
  add('ro.boot.flash.locked', 'Bootloader flash lock', 'Boot', 'lock', sources.lock);
  add('ro.debuggable', 'Debuggable build flag', 'Debugging', 'boolean', sources.adb, { note: 'This is a build flag, separate from the Developer options switch. It does not prove root access.' });
  add('ro.secure', 'ADB privilege-drop flag', 'Debugging', 'boolean', sources.adb, { note: 'In AOSP, this contributes to the ADB privilege policy. It is not an overall device security status.' });
  add('ro.adb.secure', 'ADB authentication flag', 'Debugging', 'boolean', sources.adb, { note: 'Build mode, boot state, and implementation affect enforcement. Clients and authorizations are not listed here.' });
  for (const key of ['service.adb.tcp.port', 'persist.adb.tcp.port']) add(key, 'Configured ADB TCP port', 'Debugging', 'port', sources.adb, { note: 'A configuration value does not establish a listening port. Modern wireless debugging can use other properties.' });
  for (const [key, label] of [['sys.usb.config', 'Requested USB functions'], ['sys.usb.state', 'Reported USB functions'], ['persist.sys.usb.config', 'Persistent USB function preference']]) {
    add(key, label, 'USB', 'usb', sources.usb, { note: 'AOSP reference configuration; vendor behaviour can differ. This value does not prove a connected or authorized ADB client.' });
  }
  add('ro.crypto.state', 'Reported encryption state', 'Encryption', 'encryption-state', sources.encryption, { note: 'This property does not verify protection of individual files or the current user-unlock state.' });
  add('ro.crypto.type', 'Reported encryption type', 'Encryption', 'encryption-type', sources.encryption);

  function definitionFor(key) {
    if (catalogue.has(key)) return catalogue.get(key);
    if (key.startsWith('init.svc.') && key.length > 9) return { label: `Service: ${key.slice(9)}`, category: 'Services', type: 'service', source: sources.init, note: 'One recorded service state. A stopped service can be normal; a restarting state alone does not prove a crash loop.' };
    return null;
  }
  function categoryHint(key) {
    if (/^init\./.test(key)) return 'Services';
    if (/adb|debuggable|^debug\./.test(key)) return 'Debugging';
    if (/usb/.test(key)) return 'USB';
    if (/crypto|encrypt/.test(key)) return 'Encryption';
    if (/^ro\.boot\.|boot\.reason|boot_completed/.test(key)) return 'Boot';
    if (/build|security_patch/.test(key)) return 'Build';
    if (/^ro\.product\.|hardware|board|soc\./.test(key)) return 'Device';
    if (/wifi|bluetooth|radio|telephony|^gsm\.|^ril\.|^net\./.test(key)) return 'Connectivity';
    if (/audio|media|camera|display|graphics|surfaceflinger/.test(key)) return 'Media & display';
    if (/^dalvik\.|heap|dex|thermal|performance/.test(key)) return 'Runtime';
    return 'Other';
  }
  function interpret(definition, raw) {
    const value = raw.trim();
    const ok = text => ({ text, valid: true });
    const unsupported = () => ({ text: 'Value outside the supported interpretation; raw value retained', valid: false });
    if (raw === '') return ok('Empty recorded value');
    if (!value) return ok('Whitespace-only value recorded');
    if (value === 'null') return ok('Literal null recorded; meaning not assumed');
    if (!definition) return ok('Raw value; no documented explanation in this catalogue');
    switch (definition.type) {
      case 'text': return ok(`${definition.label} recorded`);
      case 'boolean': return ['0', '1'].includes(value) ? ok(`Flag ${value === '1' ? 'on' : 'off'} (recorded)`) : unsupported();
      case 'integer': return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? ok(`API level ${Number(value)} recorded`) : unsupported();
      case 'date': {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
        return date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? ok('Calendar date recorded as the patch level') : unsupported();
      }
      case 'build-type': return ['user', 'userdebug', 'eng'].includes(value) ? ok({ user: 'Production build type recorded', userdebug: 'Debug-capable user build recorded', eng: 'Engineering build recorded' }[value]) : unsupported();
      case 'tags': return ok('Build-tag text recorded; signing authenticity unverified');
      case 'verified-boot': return ['green', 'yellow', 'orange'].includes(value) ? ok({ green: 'Locked boot state with a non-user-set verification key reported', yellow: 'Locked boot state with a user-set verification key reported', orange: 'Unlocked boot state reported' }[value]) : unsupported();
      case 'lock': return value === '1' ? ok('Locked flag recorded') : value === '0' ? ok('Unlocked flag recorded') : unsupported();
      case 'encryption-state': return value === 'encrypted' ? ok('Encryption reported by the property') : value === 'unencrypted' ? ok('Unencrypted state reported by the property') : unsupported();
      case 'encryption-type': return value === 'file' ? ok('File-based encryption reported') : unsupported();
      case 'service': return ['running', 'stopped', 'stopping', 'restarting'].includes(value) ? ok(`Service ${value} at capture time`) : unsupported();
      case 'usb': return /^[A-Za-z0-9_.-]+(?:,[A-Za-z0-9_.-]+)*$/.test(value) ? ok('USB function list recorded') : unsupported();
      case 'port': {
        if (!/^-?\d+$/.test(value)) return unsupported();
        const port = Number(value);
        if (port === 0 || port === -1) return ok('No positive TCP port specified by this property');
        return Number.isSafeInteger(port) && port > 0 && port <= 65535 ? ok(`TCP port ${port} configured; reachability unverified`) : unsupported();
      }
      default: return unsupported();
    }
  }
  function reviewFor(key, value, definition, interpretation) {
    if (!interpretation.valid) return 'The catalogue cannot interpret this value. Check the device or vendor definition.';
    value = value.trim();
    if (!value || value === 'null') return null;
    if (key === 'ro.boot.verifiedbootstate' && ['orange', 'yellow'].includes(value)) return 'A custom-key or unlocked boot configuration is reported. Check whether this is intended.';
    if (key === 'ro.boot.flash.locked' && value === '0') return 'An unlocked bootloader flag is recorded. Check whether this is intended.';
    if (key === 'ro.debuggable' && value === '1') return 'Debug build capability is recorded. This can be intentional on development devices.';
    if (['ro.secure', 'ro.adb.secure'].includes(key) && value === '0') return 'A less restrictive ADB flag is recorded. Its effect depends on the build and implementation.';
    if (key === 'ro.build.type' && ['eng', 'userdebug'].includes(value)) return 'A development build type is recorded. Confirm that it matches the expected firmware.';
    if (key === 'ro.build.tags' && value.split(',').some(tag => ['test-keys', 'dev-keys'].includes(tag.trim()))) return 'Development signing tags are recorded. Tags alone do not establish rooting or signing authenticity.';
    if (definition?.type === 'port' && Number(value) > 0) return 'A positive ADB TCP port is configured. Verify whether network debugging is intended.';
    if (definition?.type === 'usb' && value.split(',').includes('adb')) return 'The USB function list includes ADB. Check whether debugging is intended.';
    if (definition?.type === 'service' && value === 'restarting') return 'This service was restarting in the snapshot. Repeated captures or logs are needed to establish a crash loop.';
    if (key === 'ro.crypto.state' && value === 'unencrypted') return 'The property reports an unencrypted state. Verify the actual device configuration.';
    return null;
  }

  function analyse(text, sourceFile = 'getprop.txt', progress = () => {}) {
    if (typeof text !== 'string' || typeof sourceFile !== 'string') throw new Error('Provide a getprop text export and filename.');
    if (new TextEncoder().encode(text).byteLength > AnalysisConfig.MAX_GETPROP_BYTES) throw new Error(`This property export exceeds ${AnalysisConfig.GETPROP_LIMIT_LABEL}.`);
    if (text.includes('\0')) throw new Error('Export getprop as UTF-8 text; a NUL byte was found.');
    const chunks = text.replace(/^\uFEFF/, '').split(/(\r\n|\n|\r)/), lines = [];
    for (let i = 0; i < chunks.length; i += 2) {
      if (i === chunks.length - 1 && chunks[i] === '') break;
      lines.push({ text: chunks[i], eol: chunks[i + 1] || '' });
    }
    if (lines.length > AnalysisConfig.MAX_GETPROP_LINES) throw new Error('Too many property source lines. Reduce the export.');
    const records = [], issues = [], frequencies = new Map();
    let malformed = 0;
    const opener = /^\[([A-Za-z0-9_.@:-]+)\]:[ \t]*\[/;
    const closing = /\][ \t]*$/;
    function issue(start, end, message) {
      malformed += end - start + 1;
      if (issues.length < 100) issues.push({ line: start + 1, end_line: end + 1, message });
    }
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].text;
      if (line.length > AnalysisConfig.MAX_GETPROP_RECORD_CHARS) throw new Error(`Property source line ${index + 1} is too long.`);
      if (!line.trim()) continue;
      const match = opener.exec(line);
      if (!match) { issue(index, index, 'Expected [property.name]: [value].'); continue; }
      const start = index, key = match[1];
      let raw = line;
      let end = closing.exec(line);
      while (!end && index + 1 < lines.length && !opener.test(lines[index + 1].text)) {
        raw += lines[index].eol + lines[index + 1].text;
        index++;
        if (raw.length > AnalysisConfig.MAX_GETPROP_RECORD_CHARS) throw new Error(`Property starting at line ${start + 1} is too long.`);
        end = closing.exec(lines[index].text);
      }
      if (!end) { issue(start, index, 'Unterminated property value; the next property, if present, is kept separate.'); continue; }
      if (records.length >= AnalysisConfig.MAX_GETPROP_RECORDS) throw new Error('Too many property records. Reduce the export.');
      const value = raw.slice(match[0].length, raw.length - end[0].length);
      const definition = definitionFor(key), interpretation = interpret(definition, value);
      records.push({ id: String(start + 1), key, value, raw, source_file: sourceFile, line: start + 1, end_line: index + 1,
        prefix: key.split('.')[0], category: definition?.category || categoryHint(key), category_basis: definition ? 'catalogue' : 'name-hint',
        label: definition?.label || key, known: Boolean(definition), interpretation: interpretation.text,
        note: definition?.note || null, source: definition?.source || null,
        review: reviewFor(key, value, definition, interpretation), duplicate: false,
        service_state: definition?.type === 'service' && ['running', 'stopped', 'stopping', 'restarting'].includes(value.trim()) ? value.trim() : null,
        value_state: value === '' ? 'empty' : value.trim() === 'null' ? 'literal-null' : 'recorded',
      });
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
      if (records.length % 500 === 0) progress(`Read ${records.length.toLocaleString('en-US')} properties…`);
    }
    if (!records.length) throw new Error('No [property.name]: [value] records found. Open the output of adb shell getprop.');
    for (const row of records) row.duplicate = frequencies.get(row.key) > 1;
    return { tool: 'getprop', version: VERSION, source_file: sourceFile, analyzed_at: new Date().toISOString(), records, issues,
      counts: { records: records.length, distinct_keys: frequencies.size, physical_lines: lines.length,
        explained: records.filter(row => row.known).length, raw_only: records.filter(row => !row.known).length,
        review: records.filter(row => row.review || row.duplicate).length, duplicate_records: records.filter(row => row.duplicate).length,
        empty: records.filter(row => row.value_state === 'empty').length, literal_null: records.filter(row => row.value_state === 'literal-null').length,
        multiline: records.filter(row => row.end_line > row.line).length, malformed_lines: malformed,
        services: records.filter(row => row.key.startsWith('init.svc.') && row.key.length > 9).length,
        service_running: records.filter(row => row.service_state === 'running').length,
        service_stopped: records.filter(row => row.service_state === 'stopped').length,
        service_restarting: records.filter(row => row.service_state === 'restarting').length,
      },
      notes: [
        'Properties are recorded configuration and state. The analysis time is not the capture time, and this export does not authenticate the device.',
        'Explained means a key has a documented interpretation. Raw values are keys outside this dictionary; their categories are name hints.',
        'Review notes identify limited configuration or data checks. Zero notes does not establish device safety or absence of root or malware.',
        'A stopped init service can be normal. A single snapshot does not show how often a service restarts.',
        'Missing properties remain missing. Empty strings and literal null are preserved. Duplicate keys keep every record without choosing a winner.',
        'Multiline values retain their line endings and source ranges. Unescaped getprop text can be ambiguous if a value itself contains record-shaped lines.',
        'Values, downloads, and optional history can include identifiers. Analysis runs in this browser; no properties are uploaded or changed on the device.',
      ],
    };
  }
  function matches(row, filters = {}) {
    if (filters.prefix && row.prefix !== filters.prefix) return false;
    if (filters.category && row.category !== filters.category) return false;
    const status = filters.status;
    if (status === 'review' && !(row.review || row.duplicate)) return false;
    if (status === 'explained' && !row.known) return false;
    if (status === 'raw' && row.known) return false;
    if (status === 'duplicates' && !row.duplicate) return false;
    if (status === 'multiline' && row.line === row.end_line) return false;
    if (['empty', 'literal-null'].includes(status) && row.value_state !== status) return false;
    if (status?.startsWith('service-') && row.service_state !== status.slice(8)) return false;
    const query = String(filters.query || '').trim().toLowerCase();
    return !query || `${row.key} ${row.value} ${row.label} ${row.interpretation} ${row.note || ''} ${row.review || ''}`.toLowerCase().includes(query);
  }
  function page(records, filters = {}, requested = 0) {
    const filtered = records.filter(row => matches(row, filters));
    const pages = Math.max(1, Math.ceil(filtered.length / AnalysisConfig.GETPROP_PAGE_SIZE));
    const current = Math.min(pages - 1, Math.max(0, Math.floor(Number(requested)) || 0));
    return { total: filtered.length, page: current, pages, records: filtered.slice(current * AnalysisConfig.GETPROP_PAGE_SIZE, (current + 1) * AnalysisConfig.GETPROP_PAGE_SIZE) };
  }
  function filteredReport(summary, filters = {}) {
    const selection = Object.fromEntries(['query', 'prefix', 'category', 'status'].map(key => [key, typeof filters[key] === 'string' ? filters[key] : '']));
    const records = summary.records.filter(row => matches(row, selection));
    return { tool: 'getprop-filtered', version: VERSION, source_file: summary.source_file, analyzed_at: summary.analyzed_at, exported_at: new Date().toISOString(), filters: selection, total_records: summary.records.length, matching_records: records.length, records, notes: summary.notes };
  }
  function isSummary(value) {
    return object(value) && value.tool === 'getprop' && value.version === VERSION && typeof value.source_file === 'string' && typeof value.analyzed_at === 'string'
      && object(value.counts) && Object.values(value.counts).every(n => Number.isSafeInteger(n) && n >= 0)
      && Array.isArray(value.records) && value.records.length > 0 && value.records.length <= AnalysisConfig.MAX_GETPROP_RECORDS
      && value.records.every(row => object(row) && ['id', 'key', 'value', 'raw', 'source_file', 'prefix', 'category', 'label', 'interpretation'].every(key => typeof row[key] === 'string')
        && Number.isSafeInteger(row.line) && row.line > 0 && Number.isSafeInteger(row.end_line) && row.end_line >= row.line)
      && value.counts.records === value.records.length && Array.isArray(value.notes) && value.notes.every(note => typeof note === 'string')
      && Array.isArray(value.issues) && value.issues.length <= 100 && value.issues.every(issue => object(issue) && Number.isSafeInteger(issue.line) && Number.isSafeInteger(issue.end_line) && typeof issue.message === 'string');
  }
  return { analyse, matches, page, filteredReport, isSummary };
})();

;
const PackagesView = (() => {
  'use strict';
  const classification = { system: 'System (reported)', 'third-party': 'Third-party (reported)', unknown: 'Not established', conflicting: 'Conflicting flags' };
  const certificateLabels = { 'verified-reported': 'Verified according to source', 'error-reported': 'Certificate error reported', 'metadata-only': 'Metadata present; verification not established', unknown: 'Verification not established' };
  const recordedBoolean = value => value === true ? 'True' : value === false ? 'False' : 'Not recorded';
  const nameSources = { inventory: 'Label from inventory', import: 'Label from added metadata', catalogue: 'Catalogue name · installed label unknown', 'package-id': 'App label not recorded' };
  const versionText = pkg => [pkg.metadata.version_name ? `v${pkg.metadata.version_name.value}` : 'Version name not recorded', pkg.metadata.version_code ? `Code ${pkg.metadata.version_code.value}` : 'Version code not recorded'];

  function apkBreakdown(pkg, escapeHTML, number) {
    const group = pkg.apk_group;
    if (!pkg.files.length) return '<span class="tiny">No APK files recorded</span>';
    return `<details class="apk-group"><summary><strong>${number(pkg.files.length)} APK file${pkg.files.length === 1 ? '' : 's'}</strong><span class="tiny">${escapeHTML(group.summary)}</span></summary>
      <p>${escapeHTML(group.explanation)}</p><ul>${pkg.files.map(file => `<li><code>${escapeHTML(file.apk.filename)}</code><span>${escapeHTML(file.apk.label)}</span></li>`).join('')}</ul>
      <p class="hint">${escapeHTML(group.note)}</p></details>`;
  }
  const originLabels = { 'china-linked': 'China-linked · documented', 'needs-review': 'Needs review', 'publisher-recorded': 'Listed publisher · country recorded', 'publisher-hint': 'Namespace hint · country unverified', unclassified: 'Unclassified' };
  const basisLabels = { 'china-publisher': 'Publisher based in China', 'china-operating-group': 'Group operations in China', 'listed-publisher': 'Exact-ID publisher listing', 'publisher-namespace': 'Publisher namespace inference', 'platform-namespace': 'Reported system package with platform namespace', unresolved: 'Ownership or mapping unresolved', 'not-in-catalogue': 'No publisher-country rule' };
  
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
        ${stat('APK files', c.apk_files, 'Grouped under their package records')}
        ${stat('Multiple APKs', c.multi_file_packages, `${number(c.split_packages)} packages show split filenames`)}
        ${stat('Versions recorded', c.version_names_recorded, `${number(c.version_codes_recorded)} packages have a version code`)}
      </div>
      <section class="panel package-metadata-panel">
        <h2>App names and versions</h2>
        <p>${number(c.labels_recorded)} of ${number(c.packages)} packages have a recorded app label. ${number(c.catalogue_names)} use an exact catalogue name; ${number(c.names_unmatched)} still need a name. Package IDs remain visible.</p>
        <p class="hint">App-name matches and publisher-country evidence have separate coverage. A known app can still have an unclassified publisher.</p>
        <p class="hint">Add metadata from the same device and capture: a JSON export with app labels and versions, or a dumpsys package text file for versions. Existing values are kept when sources disagree. Dumpsys often does not contain readable app labels.</p>
        <div class="button-row"><button class="button" id="package-add-metadata">Add app details</button><button class="button" id="package-show-missing-names">Show unnamed packages</button><button class="button" id="package-export-missing-names">Export missing names</button><span class="tiny">JSON or TXT · processed locally</span></div>
        <input id="package-metadata-file" type="file" accept=".json,.txt" hidden aria-label="Choose app labels and versions">
        <p id="package-metadata-status" class="hint" role="status">${summary.metadata_import ? escapeHTML(`${summary.metadata_import.source_file}: details added to ${summary.metadata_import.updated_packages} packages; ${summary.metadata_import.unmatched_records} unmatched records; ${summary.metadata_import.conflict_fields} conflicting fields; ${summary.metadata_import.ambiguous_packages} ambiguous package matches skipped.`) : 'No additional metadata file loaded.'}</p>
      </section>
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
          ['System / third-party packages (reported)', `${number(c.system)} / ${number(c.third_party)}`],
          ['Disabled packages (reported)', number(c.disabled)],
          ['APK file entries', number(c.apk_files)],
          ['Packages containing multiple APK files', number(c.multi_file_packages)],
          ['Split APKs inferred from filenames', number(c.apk_splits)],
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
          <div class="field"><label for="package-query">Search</label><input id="package-query" type="search" placeholder="App name, package, version, UID, SHA-256…"></div>
          <div class="field"><label for="package-origin">Publisher / China connection</label><select id="package-origin"><option value="">All packages</option><option value="china-linked">Documented China links</option><option value="china-publisher">Publisher based in China only</option><option value="needs-review">Needs review</option><option value="publisher-recorded">Other publisher listings</option><option value="publisher-hint">Namespace hints · country unverified</option><option value="unclassified">Unclassified · no match or hint</option><option value="exclude-china-linked">Exclude documented matches</option></select></div>
          <div class="field"><label for="package-type">Reported type</label><select id="package-type"><option value="">All types</option><option value="system">System</option><option value="third-party">Third-party</option><option value="unknown">Unknown</option><option value="conflicting">Conflicting</option></select></div>
          <div class="field"><label for="package-disabled">Reported state</label><select id="package-disabled"><option value="">All states</option><option value="false">Not disabled</option><option value="true">Disabled</option><option value="unknown">Not recorded</option></select></div>
          <div class="field"><label for="package-installer">Installer</label><select id="package-installer"><option value="">All installers</option>${summary.installers.filter(([name]) => name !== null).map(([name]) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}</select></div>
          <div class="field"><label for="package-review">Evidence filter</label><select id="package-review"><option value="">All packages</option><option value="third-party-missing-installer">Third-party; installer not recorded</option><option value="missing-installer">Any type; installer not recorded</option><option value="findings">Has review notes</option><option value="missing-name">App name not recorded</option><option value="data-errors">Data errors reported</option><option value="certificate-unknown">Has an APK with unknown verification</option></select></div>
          <div class="field"><label for="package-layout">APK layout</label><select id="package-layout"><option value="">All layouts</option><option value="multiple">Multiple APK files</option><option value="split">Split filenames detected</option><option value="single">One APK file</option><option value="unclassified">Contains unclassified files</option><option value="empty">No APK files</option></select></div>
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
      $('package-list').innerHTML = table(['App / package', 'China connection', 'Reported type / state', 'Installer', 'APK files', 'Evidence'], result.records.map(pkg => [
        `<strong class="package-name">${escapeHTML(pkg.display_name)}</strong>${pkg.display_name !== pkg.name ? `<code class="package-id">${escapeHTML(pkg.name)}</code>` : ''}<span class="tiny">${escapeHTML(nameSources[pkg.display_name_source])}<br>UID ${escapeHTML(pkg.uid ?? 'Not recorded')}</span>`,
        `${originBadge(pkg.origin, escapeHTML)}<br><span class="tiny">${escapeHTML(pkg.origin.publisher_hint || pkg.origin.app_name || basisLabels[pkg.origin.basis])}</span>`,
        `${escapeHTML(classification[pkg.classification])}<br><span class="tiny">${pkg.disabled === true ? 'Disabled' : pkg.disabled === false ? 'Not disabled' : 'Disabled state not recorded'}</span>`,
        escapeHTML(pkg.installer ?? 'Not recorded'),
        apkBreakdown(pkg, escapeHTML, number),
        `<button class="button small" data-package="${pkg.source_index}">Inspect record</button>`,
      ]));
    };
    $('package-show-missing-names').disabled = c.names_unmatched === 0;
    $('package-export-missing-names').disabled = c.names_unmatched === 0;
    $('package-show-missing-names').onclick = () => {
      view.filters = { review: 'missing-name' }; view.page = 0;
      for (const key of filterKeys) $(`package-${key}`).value = view.filters[key] || '';
      updateRows();
      $('package-review').focus();
    };
    $('package-export-missing-names').onclick = () => {
      const template = PackageAnalysis.missingNameTemplate(summary);
      download(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }), 'package-labels-to-complete.json');
    };

    $('package-add-metadata').onclick = () => $('package-metadata-file').click();
    $('package-metadata-file').onchange = event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) helpers.importPackageMetadata(file);
    };
    const filterKeys = ['query', 'type', 'disabled', 'installer', 'review', 'origin', 'layout'];
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
    $('package-title').textContent = pkg.display_name;
    $('package-meta').textContent = `${pkg.name} · ${summary.source_file} · JSON record ${pkg.evidence}`;
    const origin = pkg.origin;
    const provenance = field => field ? `${field.source_file} · ${field.evidence}` : 'Not supplied';
    $('package-content').innerHTML = panel('App identity', nameSources[pkg.display_name_source], table(['Field', 'Value', 'Source'], [
      ['Package ID', escapeHTML(pkg.name), escapeHTML(`${summary.source_file} · ${pkg.evidence}.name`)],
      ['App label', escapeHTML(pkg.metadata.label?.value || 'Not recorded'), escapeHTML(provenance(pkg.metadata.label))],
      ...(pkg.name_evidence ? [['Catalogue app name', escapeHTML(pkg.name_evidence.name), `${pkg.name_evidence.source_url && /^https:\/\//.test(pkg.name_evidence.source_url) ? `<a href="${escapeHTML(pkg.name_evidence.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(pkg.name_evidence.source_title)}</a>` : escapeHTML(pkg.name_evidence.source_title)}<br><span class="tiny">Exact package-ID match · checked ${escapeHTML(pkg.name_evidence.checked_at || 'Date not recorded')}</span>`]] : []),
      ['Version name', escapeHTML(pkg.metadata.version_name?.value ?? 'Not recorded'), escapeHTML(provenance(pkg.metadata.version_name))],
      ['Version code', escapeHTML(pkg.metadata.version_code?.value ?? 'Not recorded'), escapeHTML(provenance(pkg.metadata.version_code))],
    ]) + (pkg.metadata_conflicts?.length ? `<details><summary>${number(pkg.metadata_conflicts.length)} conflicting metadata fields · existing values retained</summary><pre>${escapeHTML(JSON.stringify(pkg.metadata_conflicts, null, 2))}</pre></details>` : ''))
      + panel('One package, grouped APK files', `${number(pkg.files.length)} file entries · ${pkg.apk_group.summary}`, `<p>${escapeHTML(pkg.apk_group.explanation)}</p>${table(['File', 'Inferred role'], pkg.files.map(file => [escapeHTML(file.apk.filename), escapeHTML(file.apk.label)]))}<p class="hint">${escapeHTML(pkg.apk_group.note)}</p>`)
      + panel('China connection evidence', '', `${originBadge(origin, escapeHTML)}
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
        <details class="finding apk-evidence"><summary>${escapeHTML(file.apk.filename)} · ${escapeHTML(file.apk.label)}</summary><h3>${escapeHTML(file.path ?? 'Path not recorded')}</h3>
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
        </details>`).join('') || '<p>No file entries recorded.</p>');
    if (!$('package-dialog').open) $('package-dialog').showModal();
  }

  function markdown(summary) {
    const block = value => String(value ?? '').split('\n').map(line => `    ${line}`).join('\n');
    const lines = ['# Package inventory analysis', '', 'Source:', '', block(summary.source_file), '', `Analysed: ${summary.analyzed_at}`, '', '## Counts', ''];
    for (const [key, count] of Object.entries(summary.counts)) lines.push(`- ${key.replace(/_/g, ' ')}: ${count}`);
    lines.push('', '## China connection catalogue', '', `Version: ${summary.origin_catalogue.version}; checked: ${summary.origin_catalogue.checked_at}.`, '', summary.origin_catalogue.scope, '', summary.origin_catalogue.limitation);
    if (summary.name_catalogue) lines.push('', '## App name catalogue', '', `Version: ${summary.name_catalogue.version}; checked: ${summary.name_catalogue.checked_at}; ${summary.name_catalogue.rule_count} dedicated name rules.`, '', summary.name_catalogue.scope, '', summary.name_catalogue.limitation);    
    lines.push('', '## Interpretation', '', ...summary.notes.map(note => `- ${note}`), '', '## Recorded installers', '');
    for (const [installer, count] of summary.installers) lines.push(block(`${installer ?? 'Not recorded'}: ${count}`), '');
    lines.push('## Package evidence', '');
    for (const pkg of summary.packages) {
      lines.push(`### Record ${pkg.source_index}`, '', block(`${pkg.name}\nSource: ${pkg.evidence}\nUID: ${pkg.uid ?? 'Not recorded'}\nType: ${classification[pkg.classification]}\nDisabled: ${recordedBoolean(pkg.disabled)}\nInstaller: ${pkg.installer ?? 'Not recorded'}`), '');
      lines.push(block(`Display name: ${pkg.display_name}\nName source: ${nameSources[pkg.display_name_source]}\n${versionText(pkg).join('\n')}\nAPK files: ${pkg.files.length} (${pkg.apk_group.summary})\n${pkg.apk_group.explanation}\n${pkg.apk_group.note}`), '');
      for (const [key, field] of Object.entries(pkg.metadata)) if (field) lines.push(block(`${key}: ${field.value}\nSource: ${field.source_file} · ${field.evidence}`), '');
      if (pkg.name_evidence) lines.push(block(`Catalogue app name: ${pkg.name_evidence.name}\nExact package: ${pkg.name_evidence.matched_package}\nSource: ${pkg.name_evidence.source_url || pkg.name_evidence.source_title}\nChecked: ${pkg.name_evidence.checked_at || 'Not recorded'}`), '');  
      if (pkg.metadata_conflicts?.length) lines.push(block(`Metadata conflicts (existing values retained):\n${JSON.stringify(pkg.metadata_conflicts, null, 2)}`), '');
      for (const file of pkg.files) lines.push(block(`${file.apk.filename}: ${file.apk.label} (filename inference)`), '');
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
const SettingsView = (() => {
  'use strict';
  const keys = ['query', 'namespace', 'category', 'status'];
  const status = row => row.duplicate ? 'Duplicate key' : row.review ? 'Review note' : row.legacy ? 'Legacy setting' : row.known ? 'Explained' : 'Raw value';

  function render(summary, view, helpers) {
    const { $, escapeHTML, number, stat, panel, table, notes, download } = helpers;
    const counts = summary.counts;
    const categories = [...new Set(summary.records.map(row => row.category))].sort();
    $('settings-results').innerHTML = `
      <div class="stats">
        ${stat('Settings', counts.records, `${number(counts.distinct_settings)} distinct namespace/key pairs`)}
        ${stat('Namespaces loaded', counts.files, 'Global · Secure · System')}
        ${stat('Explained', counts.explained, `${number(counts.raw_only)} kept as raw values`)}
        ${stat('Review notes', counts.review, 'Configuration and data notes; not a malware score')}
      </div>
      <div class="notice"><strong>A snapshot of recorded settings.</strong><p>Values describe the exports. Device policy, Android version, and manufacturer changes can affect their meaning. Legacy keys do not establish current permissions.</p></div>
      ${panel('Loaded exports', view.sourceFiles.length ? 'Add files together or one at a time. Selecting a new file for a namespace replaces that namespace in the current session.' : 'Saved summary. Reopen all exports you want to combine; source files are not retained in history.', table(['Namespace', 'Source', 'Settings', 'Skipped lines'], ['global', 'secure', 'system'].map(namespace => {
        const file = summary.files.find(item => item.namespace === namespace);
        return [namespace, escapeHTML(file?.source_file || 'Not loaded'), file ? number(file.records) : '—', file ? number(file.malformed_lines) : '—'];
      })))}
      ${counts.malformed_lines ? `<div class="notice warning"><strong>${number(counts.malformed_lines)} line(s) could not be parsed.</strong><p>The file may contain incomplete or unrelated text. Up to 100 line locations are listed below.</p>${notes(summary.issues.map(issue => `${issue.source_file}:${issue.line} — ${issue.message}`))}</div>` : ''}
      <section class="panel">
        <div class="panel-header"><h2>Settings explorer</h2><button class="button small" id="settings-show-review">Show review notes</button></div>
        <div class="filters">
          <div class="field"><label for="setting-query">Search keys and values</label><input id="setting-query" type="search" placeholder="adb, brightness, keyboard, package name…"></div>
          <div class="field"><label for="setting-namespace">Namespace</label><select id="setting-namespace"><option value="">All loaded namespaces</option><option value="global">Global</option><option value="secure">Secure</option><option value="system">System</option></select></div>
          <div class="field"><label for="setting-category">Category</label><select id="setting-category"><option value="">All categories</option>${categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join('')}</select></div>
          <div class="field"><label for="setting-status">Evidence filter</label><select id="setting-status"><option value="">All settings</option><option value="review">Review notes / duplicate keys</option><option value="explained">Has a documented interpretation</option><option value="raw">Raw value only</option><option value="legacy">Legacy keys</option><option value="duplicates">Duplicate keys</option><option value="empty">Empty string</option><option value="literal-null">Literal null</option></select></div>
        </div>
        <div class="filter-footer"><span id="settings-count" role="status"></span><div class="button-row"><button class="button small" id="settings-clear">Clear filters</button><button class="button small" id="settings-export">Export matching JSON</button></div></div>
        <div id="settings-list"></div>
        <div class="pagination"><span id="settings-page"></span><div class="button-row"><button class="button small" id="settings-prev">Previous</button><button class="button small" id="settings-next">Next</button></div></div>
      </section>
      ${panel('Reading these settings', '', notes(summary.notes))}`;

    function updateRows() {
      const result = SettingsAnalysis.page(summary.records, view.filters, view.page);
      view.page = result.page;
      $('settings-count').textContent = `${number(result.total)} matching settings`;
      $('settings-page').textContent = `Page ${number(result.page + 1)} of ${number(result.pages)}`;
      $('settings-prev').disabled = result.page === 0;
      $('settings-next').disabled = result.page + 1 >= result.pages;
      $('settings-list').innerHTML = table(['Setting / namespace', 'Recorded value', 'Interpretation', 'Evidence'], result.records.map(row => [
        `<strong>${escapeHTML(row.key)}</strong><br><span class="tiny">${escapeHTML(row.namespace)} · ${escapeHTML(row.category)}${row.category_basis === 'name-hint' ? ' (name hint)' : ''}</span>`,
        `<code>${escapeHTML(row.value === '' ? '(empty string)' : row.value.slice(0, 180))}${row.value.length > 180 ? '…' : ''}</code>`,
        `<span class="badge ${row.review || row.duplicate ? 'warn' : 'neutral'}">${escapeHTML(status(row))}</span><p class="tiny">${escapeHTML(row.interpretation)}</p>`,
        `<button class="button small" data-setting="${escapeHTML(row.id)}">Inspect record</button><br><span class="tiny">Line ${number(row.line)}</span>`,
      ]));
    }
    for (const key of keys) {
      const input = $(`setting-${key}`);
      input.value = view.filters[key] || '';
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => { view.filters[key] = input.value; view.page = 0; updateRows(); });
    }
    function select(filters) {
      view.filters = filters; view.page = 0;
      for (const key of keys) $(`setting-${key}`).value = filters[key] || '';
      updateRows();
    }
    $('settings-clear').onclick = () => select({});
    $('settings-show-review').onclick = () => { select({ status: 'review' }); $('setting-status').focus(); };
    $('settings-prev').onclick = () => { view.page--; updateRows(); };
    $('settings-next').onclick = () => { view.page++; updateRows(); };
    $('settings-export').onclick = () => download(new Blob([JSON.stringify(SettingsAnalysis.filteredReport(summary, view.filters), null, 2)], { type: 'application/json' }), 'settings-filtered.json');
    updateRows();
  }

  function showDetails(summary, id, helpers) {
    const row = summary?.records.find(record => record.id === id);
    if (!row) return;
    const { $, escapeHTML, panel, table } = helpers;
    $('setting-title').textContent = row.key;
    $('setting-meta').textContent = `${row.namespace} · ${row.source_file}:${row.line}`;
    $('setting-content').innerHTML = panel('Recorded value', 'Full value, preserved after the first equals sign.', `<pre>${escapeHTML(row.value === '' ? '(empty string)' : row.value)}</pre>`)
      + panel('Interpretation', '', table(['Field', 'Evidence'], [
        ['Setting', escapeHTML(row.label)], ['Namespace', escapeHTML(row.namespace)],
        ['Category', escapeHTML(`${row.category}${row.category_basis === 'name-hint' ? ' (name-based hint)' : ''}`)],
        ['Status', escapeHTML(status(row))], ['Interpretation', escapeHTML(row.interpretation)],
        ['Version / context note', escapeHTML(row.note || 'No additional interpretation in this catalogue.')],
        ['Review note', escapeHTML(row.review || 'None from these checks')],
        ['Duplicate key', row.duplicate ? 'Multiple records for this key in this namespace; all are retained.' : 'No'],
      ]) + (row.source && /^https:\/\//.test(row.source) ? `<p class="hint"><a href="${escapeHTML(row.source)}" target="_blank" rel="noopener noreferrer">Android reference for this key</a></p>` : ''))
      + panel('Source evidence', '', `<p class="tiny">${escapeHTML(row.source_file)} · line ${row.line}</p><pre>${escapeHTML(`${row.key}=${row.value}`)}</pre>`);
    if (!$('setting-dialog').open) $('setting-dialog').showModal();
  }

  function markdown(summary) {
    const block = value => String(value ?? '').split(/\r\n|\n|\r/).map(line => `    ${line}`).join('\n');
    const lines = ['# Android settings analysis', '', `Analysed: ${summary.analyzed_at}`, '', '## Counts', ''];
    for (const [key, value] of Object.entries(summary.counts)) lines.push(`- ${key.replace(/_/g, ' ')}: ${value}`);
    lines.push('', '## Notes', '', ...summary.notes.map(note => `- ${note}`), '', '## Source files', '');
    for (const file of summary.files) lines.push(block(`${file.namespace}: ${file.source_file}\nRecords: ${file.records}; skipped lines: ${file.malformed_lines}`), '');
    lines.push('## Settings evidence', '');
    for (const row of summary.records) {
      lines.push(block(`${row.source_file}:${row.line} [${row.namespace}]\n${row.key}=${row.value}\n${row.interpretation}\nStatus: ${status(row)}${row.note ? `\nContext: ${row.note}` : ''}${row.review ? `\nReview: ${row.review}` : ''}${row.source ? `\nReference: ${row.source}` : ''}`), '');
    }
    if (summary.issues.length) lines.push('## Skipped lines (up to 100)', '', ...summary.issues.map(issue => block(`${issue.source_file}:${issue.line} — ${issue.message}`)));
    return lines.join('\n');
  }
  return { render, showDetails, markdown };
})();

;
const GetpropView = (() => {
  'use strict';
  const filterKeys = ['query', 'prefix', 'category', 'status'];
  const status = row => row.duplicate ? 'Duplicate key' : row.review ? 'Review note' : row.known ? 'Explained' : 'Raw value';
  const location = row => row.end_line === row.line ? `Line ${row.line}` : `Lines ${row.line}–${row.end_line}`;

  function render(summary, view, helpers) {
    const { $, escapeHTML, number, stat, panel, table, notes, download } = helpers;
    const counts = summary.counts;
    const options = values => [...new Set(values)].sort().map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('');
    const inspect = row => `<button class="button small" data-property="${escapeHTML(row.id)}">${location(row)}</button>`;
    function overview(keys) {
      return table(['Property', 'Recorded value', 'Evidence'], keys.map(([key, label]) => {
        const records = summary.records.filter(row => row.key === key);
        if (!records.length) return [escapeHTML(label), 'Not in this export', '—'];
        if (records.length > 1) return [escapeHTML(label), `${number(records.length)} records; search ${escapeHTML(key)} to inspect all values.`, '<span class="badge warn">Duplicate key</span>'];
        const row = records[0];
        return [escapeHTML(label), `<code>${escapeHTML(row.value === '' ? '(empty string)' : row.value.slice(0, 180))}${row.value.length > 180 ? '…' : ''}</code>`, inspect(row)];
      }));
    }
    $('getprop-results').innerHTML = `
      <div class="stats">
        ${stat('Properties', counts.records, `${number(counts.distinct_keys)} distinct keys`)}
        ${stat('Explained', counts.explained, `${number(counts.raw_only)} searchable raw values`)}
        ${stat('Running services', counts.service_running, `${number(counts.service_stopped)} stopped · ${number(counts.service_restarting)} restarting`)}
        ${stat('Review notes', counts.review, 'Limited checks; no overall safety verdict')}
      </div>
      <div class="notice"><strong>Recorded properties from your export.</strong><p>Explained means the property has a documented meaning. Raw values remain available even when the dictionary has no explanation. Review notes highlight configuration or data to inspect.</p></div>
      <div class="split">
        ${panel('Device and build', 'These are reported values from the file.', overview([
          ['ro.product.manufacturer', 'Manufacturer'], ['ro.product.model', 'Model'], ['ro.product.device', 'Device codename'],
          ['ro.build.version.release', 'Android release'], ['ro.build.version.sdk', 'API level'],
          ['ro.build.version.security_patch', 'Reported security patch'], ['ro.build.type', 'Build type'],
        ]))}
        ${panel('Boot and debugging', 'Inspect a source line for its meaning and limitations.', overview([
          ['ro.boot.verifiedbootstate', 'Verified Boot'], ['ro.boot.flash.locked', 'Bootloader lock flag'],
          ['ro.debuggable', 'Debuggable build flag'], ['ro.adb.secure', 'ADB authentication flag'],
          ['ro.crypto.state', 'Encryption state'], ['ro.crypto.type', 'Encryption type'], ['sys.usb.state', 'USB function list'],
        ]))}
      </div>
      ${counts.malformed_lines ? panel('Skipped source lines', `${number(counts.malformed_lines)} lines could not be parsed. Up to 100 source ranges are listed.`, notes(summary.issues.map(issue => `${location(issue)}: ${issue.message}`))) : ''}
      <section class="panel">
        <div class="panel-header"><h2>Property explorer</h2><button class="button small" id="getprop-show-review">Show review notes</button></div>
        <div class="filters">
          <div class="field"><label for="prop-query">Search keys and values</label><input id="prop-query" type="search" placeholder="boot, adb, model, service name…"></div>
          <div class="field"><label for="prop-prefix">Property prefix</label><select id="prop-prefix"><option value="">All prefixes</option>${options(summary.records.map(row => row.prefix))}</select></div>
          <div class="field"><label for="prop-category">Category</label><select id="prop-category"><option value="">All categories</option>${options(summary.records.map(row => row.category))}</select></div>
          <div class="field"><label for="prop-status">Evidence filter</label><select id="prop-status"><option value="">All properties</option><option value="review">Review notes / duplicate keys</option><option value="explained">Has a documented explanation</option><option value="raw">Raw value only</option><option value="service-running">Running services</option><option value="service-stopped">Stopped services</option><option value="service-restarting">Restarting services</option><option value="service-stopping">Stopping services</option><option value="multiline">Multiline values</option><option value="empty">Empty values</option><option value="literal-null">Literal null</option><option value="duplicates">Duplicate keys</option></select></div>
        </div>
        <div class="filter-footer"><span id="getprop-count" role="status"></span><div class="button-row"><button class="button small" id="getprop-clear">Clear filters</button><button class="button small" id="getprop-export">Export matching JSON</button></div></div>
        <div id="getprop-list"></div>
        <div class="pagination"><span id="getprop-page"></span><div class="button-row"><button class="button small" id="getprop-prev">Previous</button><button class="button small" id="getprop-next">Next</button></div></div>
      </section>
      ${panel('Understanding the result', '', notes(summary.notes))}`;
    function updateRows() {
      const result = GetpropAnalysis.page(summary.records, view.filters, view.page);
      view.page = result.page;
      $('getprop-count').textContent = `${number(result.total)} matching properties`;
      $('getprop-page').textContent = `Page ${number(result.page + 1)} of ${number(result.pages)}`;
      $('getprop-prev').disabled = result.page === 0;
      $('getprop-next').disabled = result.page + 1 >= result.pages;
      $('getprop-list').innerHTML = table(['Property', 'Recorded value', 'Meaning', 'Evidence'], result.records.map(row => [
        `<strong>${escapeHTML(row.key)}</strong><br><span class="tiny">${escapeHTML(row.category)}${row.category_basis === 'name-hint' ? ' (name hint)' : ''}</span>`,
        `<code>${escapeHTML(row.value === '' ? '(empty string)' : row.value.slice(0, 180))}${row.value.length > 180 ? '…' : ''}</code>${row.end_line > row.line ? '<br><span class="badge neutral">Multiline value</span>' : ''}`,
        `<span class="badge ${row.review || row.duplicate ? 'warn' : 'neutral'}">${status(row)}</span><p class="tiny">${escapeHTML(row.interpretation)}</p>`,
        inspect(row),
      ]));
    }
    for (const key of filterKeys) {
      const input = $(`prop-${key}`);
      input.value = view.filters[key] || '';
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => { view.filters[key] = input.value; view.page = 0; updateRows(); });
    }
    function select(filters) {
      view.filters = filters; view.page = 0;
      for (const key of filterKeys) $(`prop-${key}`).value = filters[key] || '';
      updateRows();
    }
    $('getprop-clear').onclick = () => select({});
    $('getprop-show-review').onclick = () => { select({ status: 'review' }); $('prop-status').focus(); };
    $('getprop-prev').onclick = () => { view.page--; updateRows(); };
    $('getprop-next').onclick = () => { view.page++; updateRows(); };
    $('getprop-export').onclick = () => download(new Blob([JSON.stringify(GetpropAnalysis.filteredReport(summary, view.filters), null, 2)], { type: 'application/json' }), 'getprop-filtered.json');
    updateRows();
  }
  function showDetails(summary, id, helpers) {
    const row = summary?.records.find(record => record.id === id);
    if (!row) return;
    const { $, escapeHTML, panel, table } = helpers;
    $('property-title').textContent = row.key;
    $('property-meta').textContent = `${row.source_file} · ${location(row)}`;
    $('property-content').innerHTML = panel('Recorded value', 'The full value, including any embedded line breaks.', `<pre>${escapeHTML(row.value === '' ? '(empty string)' : row.value)}</pre>`)
      + panel('Meaning', '', table(['Field', 'Explanation'], [
        ['Property', escapeHTML(row.label)], ['Status', status(row)], ['Interpretation', escapeHTML(row.interpretation)],
        ['Context', escapeHTML(row.note || 'No additional documented context for this key.')],
        ['Review note', escapeHTML(row.review || 'No review note from these limited checks')],
        ['Duplicate key', row.duplicate ? 'Every duplicate is retained. No winning value is chosen.' : 'No'],
      ]) + (typeof row.source === 'string' && /^https:\/\//.test(row.source) ? `<p class="hint"><a href="${escapeHTML(row.source)}" target="_blank" rel="noopener noreferrer">Android reference</a></p>` : ''))
      + panel('Source evidence', location(row), `<pre>${escapeHTML(row.raw)}</pre>`);
    if (!$('property-dialog').open) $('property-dialog').showModal();
  }
  function markdown(summary) {
    const block = value => String(value ?? '').split(/\r\n|\r|\n/).map(line => `    ${line}`).join('\n');
    const lines = ['# Android system properties', '', 'Source:', '', block(summary.source_file), '', `Analysed: ${summary.analyzed_at}`, '', '## Counts', ''];
    for (const [key, value] of Object.entries(summary.counts)) lines.push(`- ${key.replace(/_/g, ' ')}: ${value}`);
    lines.push('', '## Notes', '', ...summary.notes.map(note => `- ${note}`), '', '## Property evidence', '');
    for (const row of summary.records) lines.push(block(`${location(row)}\n${row.raw}\nMeaning: ${row.interpretation}\nStatus: ${status(row)}${row.note ? `\nContext: ${row.note}` : ''}${row.review ? `\nReview: ${row.review}` : ''}${row.source ? `\nReference: ${row.source}` : ''}`), '');
    if (summary.issues.length) lines.push('## Skipped source ranges (up to 100)', '', ...summary.issues.map(issue => block(`${location(issue)}: ${issue.message}`)));
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
    return { worker: null, metadataWorker: null, summary: null, tab: 'overview', busy: false, fileSize: 0, page: 0, queryId: 0, filters: {}, sourceFiles: [] };
  }
  const state = { bugreport: createToolState(), logcat: createToolState(), packages: createToolState(), settings: createToolState(), getprop: createToolState() };
  const titles = { bugreport: 'Bug Report Analyser', logcat: 'Log Analyser', packages: 'Package Analyser', settings: 'Settings Analyser', getprop: 'System Properties' };
  const historyKey = 'android_tools_history_v2';
  let route = 'home', toastTimer = null, queryTimer = null, contextTool = null, contextTarget = 1;
  let contextRequestId = 0;
  const packageUI = { $, escapeHTML, number, stat, panel, table, notes, download, importPackageMetadata };

  function importPackageMetadata(file) {
    const current = state.packages;
    if (!current.summary || current.metadataWorker) return;
    const limit = /\.json$/i.test(file.name) ? AnalysisConfig.MAX_PACKAGE_BYTES : AnalysisConfig.MAX_FILE_BYTES;
    if (!/\.(json|txt)$/i.test(file.name) || !file.size || file.size > limit) {
      $('package-metadata-status').textContent = 'Choose metadata JSON up to 20 MiB or dumpsys text up to 150 MiB.';
      return;
    }
    $('package-add-metadata').disabled = true;
    $('package-metadata-status').textContent = `Reading app details from ${file.name}…`;
    const finish = message => {
      current.metadataWorker?.terminate(); current.metadataWorker = null;
      if ($('package-add-metadata')) $('package-add-metadata').disabled = false;
      if (message && $('package-metadata-status')) $('package-metadata-status').textContent = message;
    };
    let worker;
    try {
      worker = new Worker(new URL(`analysis-worker.js?v=${AnalysisConfig.ASSET_VERSION}`, document.baseURI));
      current.metadataWorker = worker;
      worker.onmessage = ({ data }) => {
        if (current.metadataWorker !== worker) return;
        if (data.type === 'error') { finish(data.message); return; }
        if (data.type !== 'metadata-result') return;
        current.summary = data.summary;
        finish();
        renderResult('packages');
        if ($('packages-remember').checked) remember(data.summary);
        if ($('package-dialog').open) $('package-dialog').close();
        toast(`App details added to ${number(data.summary.metadata_import.updated_packages)} packages.`);
      };
      worker.onerror = event => { event.preventDefault(); if (current.metadataWorker === worker) finish('App details could not be read. Your inventory is unchanged.'); };
      worker.onmessageerror = () => { if (current.metadataWorker === worker) finish('The metadata result could not be received. Try again.'); };
      worker.postMessage({ type: 'package-metadata', summary: current.summary, file });
    } catch (_) { finish('The metadata reader could not start. Open the app with all files on a local HTTP server or hosted site.'); }
  }

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
    const settings = tool === 'settings';
    const properties = tool === 'getprop';
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
        subtitle: 'Explore app names, versions, grouped APK files, publisher evidence, and installers.',
        upload: 'Open an Android package inventory exported as a JSON array.',
        open: 'Each package groups its base and split APK files. Optional labels and versions make apps easier to recognise.',
        investigate: 'Review sourced China connections, reported system and third-party packages, installers, and missing data.',
      },
      settings: {
        eyebrow: 'ANDROID SETTINGS', noun: 'settings exports',
        subtitle: 'Explore global, secure, and system settings with their recorded values and source evidence.',
        upload: 'Choose settings_global.txt, settings_secure.txt, and settings_system.txt together or one at a time.',
        open: 'Load one to three key=value text exports. Each filename identifies its namespace.',
        investigate: 'Search every recorded value, inspect documented keys, and review debugging flags or duplicate records.',
      },
      getprop: {
        eyebrow: 'ANDROID SYSTEM PROPERTIES', noun: 'getprop.txt',
        subtitle: 'Understand device, build, boot, debugging, and service properties from a saved export.',
        upload: 'Open the text output of adb shell getprop. Multiline values are supported.',
        open: 'Load a UTF-8 .txt export containing [property.name]: [value] records.',
        investigate: 'Read the device overview, search every value, and inspect explanations with their source lines.',
      },
    }[tool];
    const uploadHint = packages
      ? `JSON · UP TO ${AnalysisConfig.PACKAGE_LIMIT_LABEL} / ${number(AnalysisConfig.MAX_PACKAGES)} PACKAGES · PROCESSED LOCALLY`
      : settings ? `1–3 TXT FILES · UP TO ${AnalysisConfig.SETTINGS_LIMIT_LABEL} · PROCESSED LOCALLY`
      : properties ? `TXT · UP TO ${AnalysisConfig.GETPROP_LIMIT_LABEL} / ${number(AnalysisConfig.MAX_GETPROP_RECORDS)} PROPERTIES · PROCESSED LOCALLY`
      : `TXT, LOG, ZIP · UP TO ${AnalysisConfig.FILE_LIMIT_LABEL} / ${number(AnalysisConfig.MAX_LINES)} LINES · PROCESSED LOCALLY`;
    $(tool).innerHTML = `
      <div class="page-heading"><div><div class="eyebrow">${view.eyebrow}</div><h1>${titles[tool]}</h1><p class="subtitle">${view.subtitle}</p></div><button class="button" data-demo="${tool}">Try a sample</button></div>
      <div id="${tool}-upload" class="upload-panel" data-drop="${tool}">
        <div class="upload-icon">${icon('upload')}</div><h2>Drop your ${view.noun} here</h2><p>${view.upload}</p>
        <div class="button-row"><button class="button primary" data-browse="${tool}">${icon('file')}Choose ${settings ? 'files' : 'file'}</button></div><p class="upload-hint">${uploadHint}</p>
        <input id="${tool}-file" type="file" accept="${packages ? '.json' : settings || properties ? '.txt' : '.txt,.log,.zip'}" ${settings ? 'multiple' : ''} hidden aria-label="Choose ${view.noun}">
      </div>
      <label class="remember"><input id="${tool}-remember" type="checkbox">Remember analysis summaries in this browser${settings || properties ? ' (includes raw values and identifiers)' : ''}</label>
      <div id="${tool}-error" class="notice error" role="alert" hidden></div>
      <div id="${tool}-loading" class="loading" hidden><span class="spinner" aria-hidden="true"></span><span id="${tool}-progress" class="loading-text" role="status" aria-live="polite">Reading your file…</span><button class="button small" data-cancel="${tool}">Cancel</button></div>
      <div id="${tool}-archive" class="archive-picker" hidden><h2>Choose a file from this archive</h2><p>The archive contains several text files. Select the capture to analyse.</p><label class="field-label" for="${tool}-entry">File in archive</label><select id="${tool}-entry"></select><div class="button-row"><button class="button primary" data-entry="${tool}">Analyse selected file</button><button class="button" data-cancel="${tool}">Cancel</button></div></div>
      <div id="${tool}-filebar" class="file-bar" hidden><div class="file-info">${icon('file')}<div><span class="filename" id="${tool}-filename"></span><span class="file-meta" id="${tool}-filemeta"></span></div></div><div class="button-row report-actions">${settings ? '<button class="button small" data-browse="settings">Add / replace exports</button>' : ''}<button class="button small" data-download="${tool}" data-format="json">${icon('download')}JSON</button><button class="button small" data-download="${tool}" data-format="md">Report</button><button class="button small" data-reset="${tool}">${settings ? 'New analysis' : 'New file'}</button></div></div>
      <div id="${tool}-results" hidden></div>
      <div id="${tool}-help" class="help-grid"><div class="help-card"><span class="step">01 / OPEN</span><h3>Start with your capture</h3><p>${view.open}</p></div><div class="help-card"><span class="step">02 / INVESTIGATE</span><h3>Follow the evidence</h3><p>${view.investigate}</p></div><div class="help-card"><span class="step">03 / EXPORT</span><h3>Take the findings with you</h3><p>Download a JSON summary or a readable Markdown report.${log ? ' Export matching raw log entries too.' : ''}</p></div></div>`;
    $(`${tool}-file`).addEventListener('change', event => {
      const files = Array.from(event.target.files || []);
      if (files.length) { if (settings) openSettings(files); else openFile(tool, files[0]); }
      event.target.value = '';
    });
    const drop = $(`${tool}-upload`);
    for (const name of ['dragenter', 'dragover']) drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragging'); });
    drop.addEventListener('dragleave', event => { if (!drop.contains(event.relatedTarget)) drop.classList.remove('dragging'); });
    drop.addEventListener('drop', event => {
      event.preventDefault(); drop.classList.remove('dragging');
      if (settings) { openSettings(Array.from(event.dataTransfer.files)); return; }
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
    state[tool].metadataWorker?.terminate();
    if (tool === 'logcat') { clearTimeout(queryTimer); queryTimer = null; }
    Object.assign(state[tool], createToolState(), { queryId: state[tool].queryId + 1 });
    for (const id of ['loading', 'error', 'archive', 'filebar', 'results']) $(`${tool}-${id}`).hidden = true;
    $(`${tool}-results`).replaceChildren(); $(`${tool}-upload`).hidden = false; $(`${tool}-help`).hidden = false;
    $(tool).setAttribute('aria-busy', 'false');
    if (tool === 'packages' && $('package-dialog').open) $('package-dialog').close();
    if (tool === 'settings' && $('setting-dialog').open) $('setting-dialog').close();
    if (tool === 'getprop' && $('property-dialog').open) $('property-dialog').close();
    if (contextTool === tool) {
      contextRequestId++;
      contextTool = null;
      if ($('context-dialog').open) $('context-dialog').close();
    }
  }
  function openFile(tool, file) {
    const validationError = validateCapture(file, tool);
    if (validationError) { showError(tool, validationError); return; }
    startAnalysis(tool, file.size, file.name, { type: 'open', file, tool });
  }
  function openSettings(files) {
    const error = SettingsAnalysis.validateFiles(files);
    if (error) { showError('settings', error); return; }
    const combined = new Map(state.settings.sourceFiles.map(file => [SettingsAnalysis.namespaceForFile(file.name), file]));
    for (const file of files) combined.set(SettingsAnalysis.namespaceForFile(file.name), file);
    const exports = [...combined.values()];
    startAnalysis('settings', exports.reduce((sum, file) => sum + file.size, 0), `${exports.length} settings export(s)`, { type: 'open-settings', files: exports }, exports);
  }
  function startAnalysis(tool, fileSize, label, request, sourceFiles = []) {
    reset(tool);
    state[tool].fileSize = fileSize;
    state[tool].sourceFiles = sourceFiles;
    setBusy(tool, true); $(`${tool}-upload`).hidden = true; $(`${tool}-help`).hidden = true;
    $(`${tool}-progress`).textContent = `Opening ${label}…`;
    if (!('Worker' in window)) { failOpen(tool, 'This browser does not support analysis workers. Use a current browser.'); return; }
    let worker;
    try {
      // Relative to the page, including a GitHub Pages repository subpath.
      worker = new Worker(new URL(`analysis-worker.js?v=${AnalysisConfig.ASSET_VERSION}`, document.baseURI));
    } catch (_) { failOpen(tool, 'The analysis worker could not start. Open the hosted site or use a local HTTP server, with all site files in the same folder.'); return; }
    state[tool].worker = worker;
    worker.onmessage = ({ data }) => { if (state[tool].worker === worker) handleMessage(tool, data); };
    worker.onerror = event => { event.preventDefault(); if (state[tool].worker === worker) failOpen(tool, 'Analysis stopped unexpectedly. Reload the site and check that analysis-worker.js is deployed beside index.html; for large captures, try a smaller file.'); };
    worker.onmessageerror = () => {
      if (state[tool].worker === worker) failOpen(tool, 'The browser could not receive the analysis result. Reopen the capture to try again.');
    };
    try {
      // File is structured-cloneable. Read and decode it inside the worker.
      worker.postMessage(request);
    } catch (_) {
      failOpen(tool, 'The browser could not pass this file to the local analyser. Reopen the capture to try again.');
    }
  }
  function failOpen(tool, message) {
    state[tool].worker?.terminate(); state[tool].worker = null;
    if (tool === 'settings') state[tool].sourceFiles = [];
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
      if (['open', 'open-settings', 'entry'].includes(data.operation)) failOpen(tool, data.message);
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
    } else if (tool === 'settings') {
      SettingsView.render(s, state.settings, packageUI);
    } else if (tool === 'getprop') {
      GetpropView.render(s, state.getprop, packageUI);
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
    if (s.tool === 'settings') return SettingsView.markdown(s);
    if (s.tool === 'getprop') return GetpropView.markdown(s);
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
      const valid = Array.isArray(value) ? value.filter(e => e?.summary && typeof e.summary.source_file === 'string' && e.summary.counts && Object.keys(titles).includes(e.summary.tool) && (e.summary.tool !== 'packages' || PackageAnalysis.isSummary(e.summary)) && (e.summary.tool !== 'settings' || SettingsAnalysis.isSummary(e.summary)) && (e.summary.tool !== 'getprop' || GetpropAnalysis.isSummary(e.summary))) : [];
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
    if (tool === 'getprop') {
      const sample = '[ro.product.manufacturer]: [Example]\n[ro.product.model]: [Demo device]\n[ro.build.version.release]: [16]\n[ro.build.version.sdk]: [36]\n[ro.build.version.security_patch]: [2026-01-01]\n[ro.build.type]: [userdebug]\n[ro.debuggable]: [1]\n[ro.boot.verifiedbootstate]: [orange]\n[ro.boot.flash.locked]: [0]\n[init.svc.demo]: [running]\n[init.svc.optional]: [stopped]\n[persist.example.history]: [first event\nsecond event]\n[vendor.example.empty]: []\n';
      openFile(tool, new File([sample], 'sample-getprop.txt', { type: 'text/plain' }));
      return;
    }
    if (tool === 'settings') {
      const samples = {
        global: 'adb_enabled=0\nadb_wifi_enabled=1\ndevelopment_settings_enabled=1\nauto_time=1\ndebug_app=null\nwindow_animation_scale=0.5\n',
        secure: 'accessibility_enabled=0\ninstall_non_market_apps=1\nlocation_mode=3\nenabled_accessibility_services=\n',
        system: 'screen_brightness_mode=0\nscreen_brightness=80\nscreen_off_timeout=120000\nfont_scale=1.2\nexample_vendor_setting=a=b\n',
      };
      openSettings(Object.entries(samples).map(([namespace, text]) => new File([text], `settings_${namespace}.txt`, { type: 'text/plain' })));
      return;
    }
    if (tool === 'packages') {
      const inventory = [
        { name: 'com.example.system', label: 'Example System', versionName: '1.0', versionCode: 1, uid: 10001, system: true, third_party: false, disabled: false, installer: 'null', files: [{ path: '/system/app/Example/base.apk', sha256: 'a'.repeat(64), verified_certificate: false, trusted_certificate: false }] },
        { name: 'com.example.reader', label: 'Example Reader', versionName: '2.4.1', versionCode: '20401', uid: 10002, system: false, third_party: true, disabled: false, installer: 'com.example.store', files: ['base.apk', 'split_config.arm64_v8a.apk', 'split_config.en.apk'].map(filename => ({ path: `/data/app/com.example.reader/${filename}`, sha256: 'b'.repeat(64), verified_certificate: false })) },
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
    if (d.setting != null) SettingsView.showDetails(state.settings.summary, d.setting, packageUI);
    if (d.property != null) GetpropView.showDetails(state.getprop.summary, d.property, packageUI);
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

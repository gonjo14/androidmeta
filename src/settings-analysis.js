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

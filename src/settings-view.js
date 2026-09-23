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

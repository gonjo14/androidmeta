const PackagesView = (() => {
  'use strict';
  const classification = { system: 'System (reported)', 'third-party': 'Third-party (reported)', unknown: 'Not established', conflicting: 'Conflicting flags' };
  const certificateLabels = { 'verified-reported': 'Verified according to source', 'error-reported': 'Certificate error reported', 'metadata-only': 'Metadata present; verification not established', unknown: 'Verification not established' };
  const recordedBoolean = value => value === true ? 'True' : value === false ? 'False' : 'Not recorded';

  function render(summary, view, helpers) {
    const { $, escapeHTML, number, stat, panel, table, notes } = helpers;
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
          <div class="field"><label for="package-query">Search</label><input id="package-query" type="search" placeholder="Package, UID, installer, path, SHA-256…"></div>
          <div class="field"><label for="package-type">Reported type</label><select id="package-type"><option value="">All types</option><option value="system">System</option><option value="third-party">Third-party</option><option value="unknown">Unknown</option><option value="conflicting">Conflicting</option></select></div>
          <div class="field"><label for="package-disabled">Reported state</label><select id="package-disabled"><option value="">All states</option><option value="false">Not disabled</option><option value="true">Disabled</option><option value="unknown">Not recorded</option></select></div>
          <div class="field"><label for="package-installer">Installer</label><select id="package-installer"><option value="">All installers</option>${summary.installers.filter(([name]) => name !== null).map(([name]) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}</select></div>
          <div class="field"><label for="package-review">Evidence filter</label><select id="package-review"><option value="">All packages</option><option value="third-party-missing-installer">Third-party; installer not recorded</option><option value="missing-installer">Any type; installer not recorded</option><option value="findings">Has review notes</option><option value="data-errors">Data errors reported</option><option value="certificate-unknown">Has an APK with unknown verification</option></select></div>
        </div>
        <div class="filter-footer"><span id="package-count" role="status"></span><button class="button small" id="package-clear">Clear filters</button></div>
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
      $('package-list').innerHTML = table(['Package / UID', 'Reported type / state', 'Installer', 'APK files', 'Notes', 'Evidence'], result.records.map(pkg => [
        `${escapeHTML(pkg.name)}<br><span class="tiny">UID ${escapeHTML(pkg.uid ?? 'Not recorded')}</span>`,
        `${escapeHTML(classification[pkg.classification])}<br><span class="tiny">${pkg.disabled === true ? 'Disabled' : pkg.disabled === false ? 'Not disabled' : 'Disabled state not recorded'}</span>`,
        escapeHTML(pkg.installer ?? 'Not recorded'),
        number(pkg.files.length),
        pkg.findings.length ? `${number(pkg.findings.length)} review note(s)` : 'No inventory issues identified',
        `<button class="button small" data-package="${pkg.source_index}">Inspect record</button>`,
      ]));
    }

    for (const key of ['query', 'type', 'disabled', 'installer', 'review']) {
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
      for (const key of ['query', 'type', 'disabled', 'installer', 'review']) $(`package-${key}`).value = '';
      updateRows();
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
    $('package-content').innerHTML = panel('Reported package fields', '', table(['Field', 'Value'], [
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
    lines.push('', '## Interpretation', '', ...summary.notes.map(note => `- ${note}`), '', '## Recorded installers', '');
    for (const [installer, count] of summary.installers) lines.push(block(`${installer ?? 'Not recorded'}: ${count}`), '');
    lines.push('## Package evidence', '');
    for (const pkg of summary.packages) {
      lines.push(`### Record ${pkg.source_index}`, '', block(`${pkg.name}\nSource: ${pkg.evidence}\nUID: ${pkg.uid ?? 'Not recorded'}\nType: ${classification[pkg.classification]}\nDisabled: ${recordedBoolean(pkg.disabled)}\nInstaller: ${pkg.installer ?? 'Not recorded'}`), '');
      for (const finding of pkg.findings) lines.push(block(`${finding.evidence}: ${finding.detail}`), '');
      for (const file of pkg.files) lines.push(block(`${file.evidence}\nPath: ${file.path ?? 'Not recorded'}\nAPK SHA-256: ${file.sha256 ?? 'Not recorded'}\nCertificate: ${certificateLabels[file.certificate_status]}\nverified_certificate: ${recordedBoolean(file.verified_certificate)}\ntrusted_certificate: ${recordedBoolean(file.trusted_certificate)}\nCollection error: ${file.error ?? 'None reported'}\nCertificate error: ${file.certificate_error ?? 'None reported'}`), '');
    }
    return lines.join('\n');
  }

  return { render, showDetails, markdown };
})();

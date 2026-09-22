# Adding Android package inventory analysis

The app now has a third tool, **Package Analyser**. It reads the array format in
your attached `packages.json`; this is separate from an npm `package.json`.

## Install and use

1. Replace the application's HTML and JavaScript with `dist/index.html` and
   `dist/bugreport.js` from this archive. Keep both revised files together.
2. Keep your existing `styles.css` alongside them. It was not supplied, so it
   is not included in this archive.
3. Open the HTML, select **Package Analyser**, and choose `packages.json`.
4. Search names, UIDs, installers, APK paths, APK SHA-256 values, or certificate
   SHA-256 values. Combine this with type, disabled-state, installer, and
   evidence filters. Results are paginated in groups of 50.
5. Select **Inspect record** to see reported fields, file metadata, certificate
   coverage, and JSON locations such as `$[12].files[0]`.
6. Use **JSON** or **Report** to export the complete analysis. These exports
   include all package records, independently of the current explorer filter.
   Optional history keeps the normalized inventory so it can be searched again.

JSON parsing and analysis run in a Web Worker. No package names, hashes, or
files are sent to an external service. The archive contains synthetic test data;
your uploaded inventory is not bundled into the application or test fixtures.

## Where the feature lives

| Layer | File | Responsibility |
| --- | --- | --- |
| Input boundary | `src/config.js` | Accept `.json` for the package tool; reject empty or oversized input before reading. |
| Analysis | `src/packages-analysis.js` | Parse, validate, normalize, aggregate, and produce findings with evidence references. |
| Worker dispatch | `src/analysis-worker.js` | Route `tool: 'packages'` to the package analyser before log parsing. |
| Presentation | `src/packages-view.js` | Filtered table, details dialog, and Markdown export. |
| App integration | `src/app.js` | File selection, sample, lifecycle, JSON export, and saved history. |
| Navigation | `src/index.template.html` | Sidebar entry, overview card, page container, and details dialog. |
| Build | `scripts/build.mjs` | Include the analysis in the worker and its filtering/view code in the UI bundle. |

The worker dispatch is intentionally small:

```js
if (activeTool === 'packages') {
  report = PackageAnalysis.analyse(text, source, progress);
  postMessage({ type: 'result', summary: report });
  return;
}
```

The pure analyser can be tested without the UI. For example, its output contract
contains `tool`, `version`, `counts`, `packages`, `installers`, and `notes`.
Each package and APK entry retains its original array index and JSON reference.
Duplicate package names remain separate records rather than being silently merged.

Limits are 20 MiB of JSON, 10,000 package records, and 100,000 APK file entries.
This version accepts extracted `.json` files; package inventories inside ZIPs
must be extracted first. The existing log/bugreport ZIP support is unchanged.

## Checks and their meaning

| Check | Interpretation |
| --- | --- |
| Root array and field types | Reject incompatible JSON with a field-specific error. Do not coerce a string such as `"false"` to a boolean. |
| Empty/`"null"` installer | Normalize to unknown. A missing installer for a third-party package is an information gap, not proof of sideloading. |
| Missing booleans | Keep unknown separate from `false`. |
| APK SHA-256 | Check for 64 hexadecimal characters and preserve the recorded value. No APK bytes are available to recompute it. |
| Multiple files | Count each APK entry, including split APKs, while counting the parent package once. |
| Empty certificate fields and year-0001 dates | Treat these as absent metadata. False verification/trust flags alone do not establish a bad signature. |
| `verified_certificate: true` | Label as verification reported by the source. The analyser does not independently verify that claim. |
| Certificate or collection errors | Display the recorded error and its exact JSON reference for review. |
| Conflicting classification flags | Flag a data inconsistency if `system` and `third_party` are both true. |
| Shared UIDs and system packages in `/data/app` | Summarize as context. Neither is given a malware score. |

The certificate states are `unknown`, `metadata-only`, `verified-reported`, and
`error-reported`. The raw `verified_certificate` and `trusted_certificate`
booleans remain visible in the details and JSON export.

## Results from the supplied inventory

| Observation | Count |
| --- | ---: |
| Package records / distinct names | 618 / 618 |
| Reported system packages | 499 |
| Reported third-party packages | 119 |
| Reported disabled packages | 29 |
| APK file entries | 1,006 |
| Recorded APK SHA-256 values with valid format | 1,006 |
| Packages without a recorded installer | 411 |
| Third-party packages without a recorded installer | 6 |
| Populated certificate metadata entries | 0 |
| Entries reporting successful certificate verification | 0 |
| Collection / certificate errors reported | 0 / 0 |
| System packages with an APK in `/data/app` | 96 |
| Shared UID groups | 12 |

All 1,006 file entries have `verified_certificate: false` and
`trusted_certificate: false`, empty certificate fields, and no reported error.
That does not tell us whether verification was attempted. Their status remains
**verification not established**. The six missing-installer observations are
information gaps. No conclusion about malware follows from these counts.

## For deeper analysis

To validate a signature, obtain the actual APK and use the Android SDK tool:

```sh
apksigner verify --verbose --print-certs app.apk
```

This verifies the APK and prints signer information; it does not establish that
the app's behaviour is benign. If available, compare the signer certificate and
APK hash with an independently obtained trusted reference. The APK SHA-256 and
the signing certificate SHA-256 identify different things and must not be
compared interchangeably.

Permissions, enabled accessibility services, package versions, installation
times, and runtime behaviour require additional capture data. A later matching
layer could join package names to the bugreport's recorded grants and services,
or match APK hashes against a user-supplied indicator list while retaining the
indicator source and date. Those checks are not part of this update.

References: [Android apksigner](https://developer.android.com/tools/apksigner)
and [ApplicationInfo flags](https://developer.android.com/reference/android/content/pm/ApplicationInfo).

## Verification

All 38 automated regression tests pass. The generated worker was also run
against the complete attached inventory, with its package/file counts and
certificate states checked. The exported Markdown retained all 618 records.
The UI tests use DOM and Worker doubles. Full browser/visual testing is still
pending because no browser executable or original stylesheet is available here.

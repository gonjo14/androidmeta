# Android Tools: focused senior-developer refactor

The first step is to make the existing behaviour easier to trust and change.
Your use of Web Workers, escaped log output, ZIP extraction limits, and source
context is worth keeping. This refactor addresses concrete defects and separates
the editable source from the generated offline files.

Version 0.2 adds **Package Analyser** for Android `packages.json` inventories.
It includes offline import, schema checks, evidence-based findings, filters,
APK/certificate details, history, and JSON/Markdown reports. See
[PACKAGE_ANALYSER.md](PACKAGE_ANALYSER.md) for integration and interpretation.

## Use the revised files

The archive includes ready-built replacements:

- `dist/index.html`: the HTML page with its bundled worker.
- `dist/bugreport.js`: the UI and shared settings.

Copy **both files together** into your application directory and keep your
existing `styles.css` alongside them. The stylesheet was not attached, so it
is not included. The worker message format changed: mixing an old HTML file
with the revised JavaScript file will not work.

Open `index.html` to use the offline application. There are no CDN dependencies
or new runtime packages. This is an incremental code refactor, not a UI redesign.

## What changed and why

| Original issue | Change | Benefit |
| --- | --- | --- |
| `openFile()` read the entire file before the worker checked its size. The error said 100 MiB while the actual limit was 150 MiB. | Share validation and settings between the UI and worker; validate before reading and send the `File` object to the worker. | Reject unsuitable input before allocating its contents and display a consistent limit. |
| Context responses identified only the tool, not the request. | Add monotonically increasing request IDs to context requests, replies, and errors; invalidate them when the dialog closes or the tool resets. | A reply for an earlier selection cannot replace the current source context. |
| `reset()` left a pending query debounce timer; pagination remained enabled while a filter changed. | Cancel the timer, invalidate requests, and disable page controls until current results arrive. | UI controls reflect the query currently being processed. |
| Raw crash/ANR parsing discarded source locations. Joining all unparsed lines could also remove boundaries between unrelated blocks. | Parse raw candidates against the original physical lines; preserve `line` and `endLine`, stop at another crash/log record, and bound stack lookahead. | Findings point back to the correct evidence; adjacent raw crashes remain separate. |
| `query()` accumulated an index for every matching record. | Retain the requested page and the last page while counting all matches. | Additional row storage is bounded by two pages, including when an old page number must be clamped. |
| Summary creation allocated an array of every timestamp. | Track first/last timestamps and the missing-year flag in one pass. | Avoid another allocation proportional to the number of records. |
| The line limit counted a terminal newline as an extra physical line. | Match the parser's physical-line convention. | A capture exactly at the line limit is accepted with or without a terminal newline. |
| Application source and minified third-party code were embedded together. | Separate source files, retain the pinned JSZip code, and generate the deployable HTML/JS. | Changes and tests can target application code without editing the vendor bundle. |

A browser can send `File` objects through `Worker.postMessage()` using structured
cloning. Reading happens in the worker; this does **not** claim zero-copy
behaviour or that the complete analysis has constant memory usage.
[API reference](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

## Source layout

| File | Responsibility |
| --- | --- |
| `src/index.template.html` | Page structure and the worker insertion point. |
| `src/config.js` | Shared limits and file metadata validation. |
| `src/logcat.js` | Log formats, signal detection, grouping, and summaries. |
| `src/log-query.js` | Filtering and bounded pagination. |
| `src/bugreport-analysis.js` | Bugreport crashes, battery statistics, package heuristics, and report assembly. |
| `src/packages-analysis.js` | Package inventory validation, normalized evidence, counts, findings, and filtering. |
| `src/packages-view.js` | Package explorer, metadata dialog, and Markdown report. |
| `src/analysis-worker.js` | File reads, archive handling, request/reply protocol, and worker state. |
| `src/app.js` | Navigation, rendering, dialogs, downloads, history, and UI state. |
| `scripts/build.mjs` | Assemble the offline distribution. |
| `tests/` | Parser, worker, UI lifecycle, and optional browser checks. |
| `vendor/` | Existing JSZip 3.10.1 and license notices. |

These are classic-script source files with explicit build order, rather than ES
modules. That preserves the existing Blob-worker approach and direct `file://`
deployment. Edit `src/` and rebuild; generated `dist/` files are not the source
of truth.

## Build and test

Requires Node.js 20 or later. Build and unit tests use only built-in Node APIs;
there is no package installation step.

```sh
node scripts/build.mjs
node --test tests/*.test.mjs
```

To include the stylesheet in the build:

```sh
node scripts/build.mjs /path/to/your/styles.css
```

**Verification performed:** all 38 automated tests passed on Node.js 24.19.0.
They cover supported log formats, interleaved Java crashes, raw source positions,
adjacent crash boundaries, stack continuations, pagination, file/read failures,
ZIP selection and extraction limits, exports, context correlation, and UI reset.
The UI tests use small DOM and Worker doubles; they are not browser tests.
Package tests additionally cover schema failures, missing values, false certificate
flags, split APK counts, duplicate records, filters, limits, escaping, and history.
The supplied inventory was also processed through the generated worker: all 618
package records and 1,006 APK entries were retained, and expected counts matched.

`tests/browser-smoke.mjs` is an additional Playwright check for opening the built
files, running all three samples, filtering, stale replies, and file validation.
It requires Playwright and Chromium. It was **not executed successfully** in
this environment because no browser executable is installed. The original
stylesheet was also unavailable, so visual and cross-browser checks remain
necessary when integrating the files. No large-capture performance benchmark
was performed; the 150 MiB input limit is not a browser memory guarantee.

## What I would address next

1. **Validate saved summaries at the boundary.** `historyEntries()` still checks
   only a few fields, while renderers expect nested arrays and objects. Add a
   versioned schema and explicit migrations before changing the report format.
2. **Test Android heuristics with representative captures.** The existing
   accessibility parser collects every `ComponentInfo` in the service dump,
   which does not by itself distinguish an enabled service from another listed
   component. Nearby native-event correlation also discards the year and time
   zone. Those behaviours need format-specific fixtures before being trusted
   across Android versions.
3. **Separate total counts from display limits.** The existing package-indicator
   count uses the already-truncated contributor list, so it cannot exceed ten.
   This refactor preserves that report schema; a follow-up should count matches
   before limiting the displayed examples.
4. **Profile realistic large captures.** Parsing still retains source lines,
   record objects, and grouped findings, and each query still scans all records.
   Add indexing or chunked parsing only after measuring time and peak memory.
5. **Continue splitting by responsibility.** Move individual result views and
   report export/history out of `app.js`, and separate battery/access analysis
   from crash analysis. Add contracts around those boundaries as they move.

The useful senior-development habit is to pair each behavioural change with
evidence and a regression check, then take the next small, reviewable step.

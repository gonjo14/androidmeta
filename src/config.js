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

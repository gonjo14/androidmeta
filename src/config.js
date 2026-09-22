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
});

// Metadata checks must run before reading bytes, on both sides of the worker.
function validateCapture(file) {
  if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0) {
    return 'Choose a valid file from your device.';
  }
  if (file.size === 0) return 'This file is empty. Choose a bugreport or logcat capture.';
  if (file.size > AnalysisConfig.MAX_FILE_BYTES) {
    return `This file exceeds the ${AnalysisConfig.FILE_LIMIT_LABEL} limit. Choose a smaller capture.`;
  }
  if (!/\.(txt|log|zip)$/i.test(file.name)) return 'Choose a .txt, .log, or .zip file.';
  return null;
}

const LogQuery = (() => {
  /** Scan all records for an exact count, retaining at most two pages. */
  function selectPage(records, filters = {}, requestedPage = 0) {
    const { PAGE_SIZE, ROW_PREVIEW_CHARS } = AnalysisConfig;
    const value = Number(requestedPage);
    const requested = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const offset = requested * PAGE_SIZE;
    const requestedRows = [];
    let total = 0;
    let lastPage = [];

    for (const record of records) {
      if (!Logcat.matches(record, filters)) continue;
      if (total % PAGE_SIZE === 0) lastPage = [];
      lastPage.push(record);
      if (total >= offset && total < offset + PAGE_SIZE) requestedRows.push(record);
      total++;
    }

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requested, pages - 1);
    // A filter may leave fewer pages than the previous query had.
    const selected = page === requested ? requestedRows : lastPage;
    return {
      total, page, pages,
      records: selected.map(record => ({
        ...record,
        message: record.message.slice(0, ROW_PREVIEW_CHARS),
        shortened: record.message.length > ROW_PREVIEW_CHARS,
      })),
    };
  }

  return { selectPage };
})();

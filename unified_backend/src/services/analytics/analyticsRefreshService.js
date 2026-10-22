/**
 * Analytics Refresh Service
 *
 * Orchestrates the PostgreSQL → DuckDB full-snapshot refresh.
 *
 * Strategy: safe full replace
 *   1. Read all attendance + dimension fields from PostgreSQL.
 *   2. Drop the staging table if it exists.
 *   3. Load everything into a staging table.
 *   4. Validate row counts.
 *   5. Atomically rename staging → production (DROP old + RENAME).
 *   6. Update analytics_metadata.
 *   If any step fails after step 3, the original table is preserved
 *   so the API keeps serving the last known-good dataset.
 *
 * Concurrency: a process-local lock (_refreshInProgress) prevents overlapping
 * refreshes within a single Node.js process.
 * LIMITATION: In a multi-replica deployment each replica runs its own refresh
 * independently. Before scaling horizontally, add a distributed lock
 * (e.g. PostgreSQL advisory lock or Redis) and a dedicated refresh worker.
 */

'use strict';

const { logger }        = require('../../utils/logger');
const analyticsConfig   = require('../../config/analytics');
const duckdb            = require('./duckdbService');
const sourceRepo        = require('../../repositories/analyticsSourceRepository');

let _refreshInProgress  = false;
let _refreshTimer       = null;

// ── Column type map for the DuckDB appender ───────────────────────────────────
// Matches the attendance_fact schema defined in duckdbService.initialize()
const FACT_COLUMN_TYPES = [
  'bigint',   // attendance_id
  'varchar',  // student_id  (library_id, e.g. "4SV21CS001")
  'bigint',   // class_id
  'date',     // attendance_date
  'varchar',  // status
  'bigint',   // subject_id
  'bigint',   // section_id
  'bigint',   // semester_id
  'bigint',   // department_id
  'bigint',   // faculty_id
  'varchar',  // academic_year
];

const FACT_COLUMNS = [
  'attendance_id', 'student_id', 'class_id', 'attendance_date', 'status',
  'subject_id', 'section_id', 'semester_id', 'department_id', 'faculty_id',
  'academic_year',
];

// ── Update metadata helper ────────────────────────────────────────────────────

const _updateMetadata = async (patch) => {
  // Build SET clause dynamically from patch keys
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values     = fields.map((f) => patch[f]);
  await duckdb.runSql(
    `UPDATE analytics_metadata SET ${setClauses} WHERE dataset_name = $1`,
    ['attendance_fact', ...values],
  );
};

// ── Core refresh ──────────────────────────────────────────────────────────────

/**
 * Run a full PostgreSQL → DuckDB snapshot refresh.
 * Returns { success, sourceRows, loadedRows, durationMs, error? }
 */
const runRefresh = async () => {
  if (!duckdb.isReady()) {
    logger.warn('[Refresh] DuckDB not ready — skipping refresh');
    return { success: false, sourceRows: 0, loadedRows: 0, durationMs: 0,
             error: 'DuckDB not ready' };
  }
  if (_refreshInProgress) {
    logger.warn('[Refresh] Refresh already in progress — skipping overlapping call');
    return { success: false, sourceRows: 0, loadedRows: 0, durationMs: 0,
             error: 'Refresh already in progress' };
  }

  _refreshInProgress = true;
  const startedAt = Date.now();
  logger.info('[Refresh] Starting attendance_fact refresh...');

  // Mark in-progress
  await _updateMetadata({ refresh_status: 'in_progress' }).catch(() => {});

  let sourceRows = 0;
  let loadedRows = 0;

  try {
    // Step 1 — Extract from PostgreSQL
    const pgRows = await sourceRepo.fetchAllAttendanceFact();
    sourceRows   = pgRows.length;
    logger.info(`[Refresh] Extracted ${sourceRows} rows from PostgreSQL`);

    // Step 2 — Drop staging if it exists
    await duckdb.runSql('DROP TABLE IF EXISTS attendance_fact_staging');

    // Step 3 — Create staging table (same schema as production)
    await duckdb.runSql(`
      CREATE TABLE attendance_fact_staging (
        attendance_id   BIGINT PRIMARY KEY,
        student_id      VARCHAR,
        class_id        BIGINT,
        attendance_date DATE,
        attendance_date_raw VARCHAR,
        status          VARCHAR,
        subject_id      BIGINT,
        section_id      BIGINT,
        semester_id     BIGINT,
        department_id   BIGINT,
        faculty_id      BIGINT,
        academic_year   VARCHAR
      )
    `);

    // Step 4 — Bulk-load into staging
    if (sourceRows > 0) {
      // Convert pg rows to typed value arrays
      const valueArrays = pgRows.map((r) => [
        r.attendance_id   != null ? Number(r.attendance_id)   : null,
        r.student_id      ?? null,
        r.class_id        != null ? Number(r.class_id)        : null,
        r.attendance_date != null
          ? (r.attendance_date instanceof Date
              ? r.attendance_date.toISOString().slice(0, 10)
              : String(r.attendance_date).slice(0, 10))
          : null,
        r.attendance_date != null                               // attendance_date_raw for diagnostics
          ? (r.attendance_date instanceof Date
              ? r.attendance_date.toISOString().slice(0, 10)
              : String(r.attendance_date).slice(0, 10))
          : null,
        r.status          ?? null,
        r.subject_id      != null ? Number(r.subject_id)      : null,
        r.section_id      != null ? Number(r.section_id)      : null,
        r.semester_id     != null ? Number(r.semester_id)     : null,
        r.department_id   != null ? Number(r.department_id)   : null,
        r.faculty_id      != null ? Number(r.faculty_id)      : null,
        r.academic_year   ?? null,
      ]);

      // Column types for staging (includes extra date_raw)
      const stagingTypes = [...FACT_COLUMN_TYPES.slice(0, 4), 'varchar', ...FACT_COLUMN_TYPES.slice(4)];
      await duckdb.bulkAppend('attendance_fact_staging', stagingTypes, valueArrays);
    }

    // Step 5 — Validate staging row count
    const countResult = await duckdb.query('SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact_staging');
    loadedRows        = Number(countResult[0]?.cnt ?? 0);
    logger.info(`[Refresh] Staging loaded: ${loadedRows} rows`);

    if (sourceRows > 0 && loadedRows === 0) {
      throw new Error(`Staging validation failed: source had ${sourceRows} rows but staging has 0`);
    }

    // Step 6 — Atomic swap: drop production, rename staging
    //   DuckDB doesn't have transactional DDL rename in all versions, so we
    //   use a two-step DROP + RENAME which is safe because we kept staging
    //   intact throughout.
    await duckdb.runSql('DROP TABLE IF EXISTS attendance_fact');
    await duckdb.runSql('ALTER TABLE attendance_fact_staging RENAME TO attendance_fact');

    const durationMs = Date.now() - startedAt;
    logger.info(`[Refresh] Completed in ${durationMs}ms — ${loadedRows} rows loaded`);

    // Step 7 — Update metadata
    await _updateMetadata({
      last_successful_refresh_at: new Date().toISOString(),
      source_row_count:           sourceRows,
      loaded_row_count:           loadedRows,
      refresh_status:             'success',
      refresh_duration_ms:        durationMs,
      last_error_summary:         null,
    });

    return { success: true, sourceRows, loadedRows, durationMs };

  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errorSummary = String(err.message || 'unknown').slice(0, 500);
    logger.error('[Refresh] Refresh failed', { error: err.message, durationMs });

    // Preserve last known-good production table; just update metadata
    await _updateMetadata({
      refresh_status:      'failed',
      refresh_duration_ms: durationMs,
      last_error_summary:  errorSummary,
    }).catch(() => {});

    // Clean up staging if it still exists
    await duckdb.runSql('DROP TABLE IF EXISTS attendance_fact_staging').catch(() => {});

    return { success: false, sourceRows, loadedRows, durationMs, error: errorSummary };

  } finally {
    _refreshInProgress = false;
  }
};

// ── Freshness helper ──────────────────────────────────────────────────────────

/**
 * Return the current analytics_metadata row for 'attendance_fact'.
 * Never throws — returns a safe default object if DuckDB is unavailable.
 */
const getMetadata = async () => {
  try {
    if (!duckdb.isReady()) return _defaultMeta();
    const rows = await duckdb.query(
      "SELECT * FROM analytics_metadata WHERE dataset_name = 'attendance_fact'",
    );
    if (!rows || rows.length === 0) return _defaultMeta();
    const m = rows[0];
    const lastRefresh = m.last_successful_refresh_at
      ? new Date(m.last_successful_refresh_at)
      : null;
    const ageMinutes = lastRefresh
      ? (Date.now() - lastRefresh.getTime()) / 60_000
      : Infinity;
    return {
      lastSuccessfulRefreshAt: lastRefresh ? lastRefresh.toISOString() : null,
      sourceRowCount:          Number(m.source_row_count  ?? 0),
      loadedRowCount:          Number(m.loaded_row_count  ?? 0),
      refreshStatus:           m.refresh_status ?? 'never_run',
      refreshDurationMs:       Number(m.refresh_duration_ms ?? 0),
      stale:                   ageMinutes > analyticsConfig.stalenessThresholdMinutes,
      analyticsAvailable:      true,
    };
  } catch {
    return _defaultMeta();
  }
};

const _defaultMeta = () => ({
  lastSuccessfulRefreshAt: null,
  sourceRowCount:          0,
  loadedRowCount:          0,
  refreshStatus:           'unavailable',
  refreshDurationMs:       0,
  stale:                   true,
  analyticsAvailable:      false,
});

// ── Scheduled refresh ─────────────────────────────────────────────────────────

/**
 * Start the process-local periodic refresh timer.
 * Idempotent — calling twice does not create two timers.
 */
const startScheduledRefresh = () => {
  if (_refreshTimer) return;
  const intervalMs = analyticsConfig.refreshIntervalMinutes * 60_000;
  logger.info(`[Refresh] Scheduled refresh every ${analyticsConfig.refreshIntervalMinutes} min`);
  _refreshTimer = setInterval(() => {
    runRefresh().catch((err) =>
      logger.error('[Refresh] Unhandled error in scheduled refresh', { error: err.message }),
    );
  }, intervalMs);
  // Don't keep the process alive just for the timer
  if (_refreshTimer.unref) _refreshTimer.unref();
};

const stopScheduledRefresh = () => {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    logger.info('[Refresh] Scheduled refresh stopped');
  }
};

module.exports = {
  runRefresh,
  getMetadata,
  startScheduledRefresh,
  stopScheduledRefresh,
};

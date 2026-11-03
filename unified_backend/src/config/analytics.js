/**
 * Analytics configuration
 *
 * All DuckDB/analytics settings are centralised here so they can be changed
 * via environment variables without touching service code.
 *
 * Risk thresholds are DEMO DEFAULTS for internal alerting UI purposes only.
 * They are NOT verified VTU/SVCE rules. Adjust them to match the institution's
 * approved policy and version-control any policy change.
 */

'use strict';

const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseFloat01 = (val, fallback) => {
  const n = parseFloat(val);
  return !isNaN(n) && n >= 0 && n <= 1 ? n : fallback;
};

const parsePositiveInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 ? n : fallback;
};

// ── Analytics config object ────────────────────────────────────────────────────

const analytics = {
  /**
   * Set to 'false' to disable DuckDB entirely.
   * Attendance writes and all PostgreSQL operations continue normally.
   * Analytics endpoints return 503 with a clear message.
   */
  enabled: process.env.DUCKDB_ENABLED !== 'false',   // default: true

  /**
   * Path to the DuckDB database file.
   * The directory must exist and be writable by the Node.js process.
   * In production, confirm filesystem persistence before using a local path.
   */
  dbPath: process.env.DUCKDB_PATH || path.join(process.cwd(), 'data', 'education_analytics.duckdb'),

  /**
   * Refresh interval in minutes.
   * The process-local timer runs a full PostgreSQL → DuckDB snapshot on this cadence.
   * NOTE: In a multi-replica deployment each replica runs its own timer independently.
   * Use an external distributed lock / dedicated worker before scaling horizontally.
   */
  refreshIntervalMinutes: parsePositiveInt(process.env.ANALYTICS_REFRESH_INTERVAL_MINUTES, 15),

  /**
   * Whether to run an initial refresh when the backend starts up.
   * Useful in development; may be disabled in production to avoid startup latency.
   */
  refreshOnStart: process.env.ANALYTICS_REFRESH_ON_START !== 'false',  // default: true

  /**
   * Maximum age (minutes) before the freshness indicator marks data as stale.
   * If the last successful refresh is older than this the API adds `stale: true`.
   */
  stalenessThresholdMinutes: parsePositiveInt(process.env.ANALYTICS_STALENESS_MINUTES, 60),

  /**
   * Attendance risk band thresholds.
   *
   * DEMO DEFAULTS — NOT official VTU/SVCE policy.
   * Values are expressed as percentages (0–100), NOT decimals.
   *
   *   attendance < critical  → band: 'critical'
   *   attendance < atRisk    → band: 'at_risk'
   *   attendance >= atRisk   → band: 'on_track'
   */
  thresholds: {
    critical: parseFloat01(process.env.ATTENDANCE_THRESHOLD_CRITICAL, 0.60) * 100,  // default 60 %
    atRisk:   parseFloat01(process.env.ATTENDANCE_THRESHOLD_AT_RISK,   0.75) * 100,  // default 75 %
  },

  /**
   * Default recovery target (as a decimal between 0 and 1).
   * Used when the client does not specify a target.
   */
  defaultRecoveryTarget: parseFloat01(process.env.ATTENDANCE_RECOVERY_TARGET, 0.75),

  /**
   * Maximum date range in days that a single analytics query may span.
   * Prevents runaway full-table scans from misconfigured clients.
   */
  maxDateRangeDays: parsePositiveInt(process.env.ANALYTICS_MAX_DATE_RANGE_DAYS, 366),

  /**
   * Default and maximum page sizes for paginated student lists.
   */
  defaultPageSize: parsePositiveInt(process.env.ANALYTICS_DEFAULT_PAGE_SIZE, 50),
  maxPageSize:     parsePositiveInt(process.env.ANALYTICS_MAX_PAGE_SIZE, 200),
};

module.exports = analytics;

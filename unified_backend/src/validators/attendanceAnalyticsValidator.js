/**
 * Attendance Analytics Validators
 *
 * All analytics endpoints are read-only (GET). Input arrives via query string.
 * These validators run before controllers so the controller never receives
 * un-validated or un-bounded inputs.
 *
 * Design choices:
 *   - class_id / student_id  are always validated on the server side via
 *     classOwnership / department checks; the validators just enforce types.
 *   - Date ranges are bounded to analyticsConfig.maxDateRangeDays to prevent
 *     runaway DuckDB full-table scans.
 *   - target (recovery rate) is strictly 0–1 inclusive.
 *   - All required fields for each endpoint are enforced here; the controller
 *     can assume they are present and well-formed.
 */

'use strict';

const { query, param } = require('express-validator');
const analyticsConfig  = require('../config/analytics');

// ── Reusable sub-rules ────────────────────────────────────────────────────────

const classIdQuery = query('class_id')
  .notEmpty().withMessage('class_id is required')
  .isInt({ min: 1 }).withMessage('class_id must be a positive integer')
  .toInt();

const fromQuery = query('from')
  .notEmpty().withMessage('from date is required (YYYY-MM-DD)')
  .isISO8601().withMessage('from must be a valid ISO date (YYYY-MM-DD)')
  .toDate();

const toQuery = query('to')
  .notEmpty().withMessage('to date is required (YYYY-MM-DD)')
  .isISO8601().withMessage('to must be a valid ISO date (YYYY-MM-DD)')
  .toDate();

const dateRangeValid = query('from').custom((from, { req }) => {
  const to = req.query.to;
  if (!from || !to) return true;  // individual validators will catch blanks
  const f = new Date(from);
  const t = new Date(to);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return true;
  if (f > t) throw new Error('"from" must not be after "to"');
  const days = (t - f) / (1000 * 60 * 60 * 24);
  if (days > analyticsConfig.maxDateRangeDays) {
    throw new Error(`Date range cannot exceed ${analyticsConfig.maxDateRangeDays} days`);
  }
  return true;
});

const pageQuery = query('page')
  .optional()
  .isInt({ min: 1 }).withMessage('page must be a positive integer')
  .toInt();

const pageSizeQuery = query('pageSize')
  .optional()
  .isInt({ min: 1, max: analyticsConfig.maxPageSize })
  .withMessage(`pageSize must be between 1 and ${analyticsConfig.maxPageSize}`)
  .toInt();

const riskBandFilter = query('riskBand')
  .optional()
  .isIn(['critical', 'at_risk', 'on_track', 'insufficient_data'])
  .withMessage('riskBand must be critical, at_risk, on_track, or insufficient_data');

// ── Endpoint-specific rule sets ───────────────────────────────────────────────

/**
 * GET /api/analytics/attendance/summary?class_id=X&from=&to=
 */
const validateSummary = [
  classIdQuery,
  fromQuery,
  toQuery,
  dateRangeValid,
];

/**
 * GET /api/analytics/attendance/risks?class_id=X&from=&to=[&riskBand=][&page=][&pageSize=]
 */
const validateRisks = [
  classIdQuery,
  fromQuery,
  toQuery,
  dateRangeValid,
  riskBandFilter,
  pageQuery,
  pageSizeQuery,
];

/**
 * GET /api/analytics/attendance/trends?class_id=X&from=&to=
 */
const validateTrends = [
  classIdQuery,
  fromQuery,
  toQuery,
  dateRangeValid,
];

/**
 * GET /api/analytics/attendance/recovery
 *   ?class_id=X&student_id=Y&future=N&target=0.75[&from=][&to=]
 */
const validateRecovery = [
  classIdQuery,

  query('student_id')
    .notEmpty().withMessage('student_id is required')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('student_id must be 1–50 characters'),

  query('future')
    .notEmpty().withMessage('future sessions count is required')
    .isInt({ min: 0, max: 10000 }).withMessage('future must be an integer 0–10000')
    .toInt(),

  query('target')
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage('target must be a decimal between 0 and 1')
    .toFloat(),

  // from/to are optional for recovery — if absent we use the full history
  query('from')
    .optional()
    .isISO8601().withMessage('from must be a valid ISO date (YYYY-MM-DD)')
    .toDate(),

  query('to')
    .optional()
    .isISO8601().withMessage('to must be a valid ISO date (YYYY-MM-DD)')
    .toDate(),
];

/**
 * GET /api/analytics/attendance/hod?from=&to=  (HOD department summary)
 */
const validateHODSummary = [
  fromQuery,
  toQuery,
  dateRangeValid,
];

/**
 * GET /api/analytics/attendance/admin?from=&to=  (Admin institution summary)
 */
const validateAdminSummary = [
  fromQuery,
  toQuery,
  dateRangeValid,
];

module.exports = {
  validateSummary,
  validateRisks,
  validateTrends,
  validateRecovery,
  validateHODSummary,
  validateAdminSummary,
};

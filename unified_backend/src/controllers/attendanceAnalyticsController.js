/**
 * Attendance Analytics Controller
 *
 * Maps HTTP requests to the attendanceAnalyticsService and handles:
 *   - Server-side authorization (never trusts client-supplied role/dept/class)
 *   - Graceful DuckDB-unavailable responses (503, no crash)
 *   - Consistent response envelope (successResponse / errorResponse from utils/response)
 *
 * Authorization rules (enforced here, not in middleware, because they require
 * async DB lookups against the authenticated user's identity):
 *
 *   Faculty:  class_id must be owned by req.user.id (employee_id) via isOwnClass()
 *   HOD:      departmentId derived from req.user.departmentCode (server-trusted)
 *   Admin:    req.user.isAdmin must be true
 *
 * Clients never supply a department_id or faculty_id as proof of authorization.
 *
 * All date defaults:
 *   from  — defaults to first day of the current academic year (Aug 1)
 *   to    — defaults to today
 */

'use strict';

const { successResponse, errorResponse, ApiError } = require('../utils/response');
const classOwnership      = require('../utils/classOwnership');
const analyticsService    = require('../services/analytics/attendanceAnalyticsService');
const refreshService      = require('../services/analytics/analyticsRefreshService');
const duckdbService       = require('../services/analytics/duckdbService');
const { DuckdbUnavailableError } = require('../services/analytics/duckdbService');
const analyticsConfig     = require('../config/analytics');
const sourceRepo          = require('../repositories/analyticsSourceRepository');

// ── Date helpers ──────────────────────────────────────────────────────────────

const toDateString = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

const defaultFrom = () => {
  // Start of current academic semester — defaulting to Aug 1 of the current year
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-08-01`;
};

const defaultTo = () => new Date().toISOString().slice(0, 10);

// ── Error handler for DuckDB errors ──────────────────────────────────────────

const handleAnalyticsError = (err, res) => {
  if (err instanceof DuckdbUnavailableError || err.name === 'DuckdbUnavailableError') {
    return res.status(503).json({
      success:  false,
      message:  'Analytics are temporarily unavailable. Attendance marking still works normally.',
      code:     'ANALYTICS_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    });
  }
  // Re-throw non-analytics errors for the global error handler
  throw err;
};

// ── 1. Class attendance summary (Faculty) ─────────────────────────────────────

/**
 * GET /api/analytics/attendance/summary?class_id=X&from=&to=
 *
 * Faculty only. Returns overall attendance stats, risk band counts, and freshness
 * for one of the requesting faculty's own classes.
 */
const getClassSummary = async (req, res) => {
  const classId = parseInt(req.query.class_id, 10);
  const from    = toDateString(req.query.from) || defaultFrom();
  const to      = toDateString(req.query.to)   || defaultTo();

  // Authorization: class must belong to this faculty
  if (!req.user.isAdmin) {
    const owned = await classOwnership.isOwnClass(classId, req.user.id);
    if (!owned) {
      throw new ApiError(403, 'Access denied. That class is not assigned to you.');
    }
  }

  try {
    const data = await analyticsService.getClassSummary(classId, from, to);
    return successResponse(res, data, 'Class attendance summary');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 2. Student risk list (Faculty) ────────────────────────────────────────────

/**
 * GET /api/analytics/attendance/risks?class_id=X&from=&to=
 *                                      [&riskBand=critical|at_risk|on_track]
 *                                      [&page=1][&pageSize=50]
 *
 * Faculty only. Returns paginated student-level risk list for a class.
 */
const getStudentRisks = async (req, res) => {
  const classId  = parseInt(req.query.class_id, 10);
  const from     = toDateString(req.query.from) || defaultFrom();
  const to       = toDateString(req.query.to)   || defaultTo();
  const page     = parseInt(req.query.page, 10)     || 1;
  const pageSize = parseInt(req.query.pageSize, 10)  || analyticsConfig.defaultPageSize;
  const riskBand = req.query.riskBand || null;

  if (!req.user.isAdmin) {
    const owned = await classOwnership.isOwnClass(classId, req.user.id);
    if (!owned) {
      throw new ApiError(403, 'Access denied. That class is not assigned to you.');
    }
  }

  try {
    const data = await analyticsService.getStudentRiskList(classId, from, to, {
      page, pageSize, riskBandFilter: riskBand,
    });
    return successResponse(res, data, 'Student attendance risk list');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 3. Attendance trend (Faculty) ─────────────────────────────────────────────

/**
 * GET /api/analytics/attendance/trends?class_id=X&from=&to=
 *
 * Faculty only. Returns date-bucketed attendance trend for a class.
 */
const getAttendanceTrends = async (req, res) => {
  const classId = parseInt(req.query.class_id, 10);
  const from    = toDateString(req.query.from) || defaultFrom();
  const to      = toDateString(req.query.to)   || defaultTo();

  if (!req.user.isAdmin) {
    const owned = await classOwnership.isOwnClass(classId, req.user.id);
    if (!owned) {
      throw new ApiError(403, 'Access denied. That class is not assigned to you.');
    }
  }

  try {
    const data = await analyticsService.getAttendanceTrend(classId, from, to);
    return successResponse(res, data, 'Attendance trend');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 4. Recovery projection (Faculty) ──────────────────────────────────────────

/**
 * GET /api/analytics/attendance/recovery
 *   ?class_id=X&student_id=Y&future=N[&target=0.75][&from=][&to=]
 *
 * Faculty only. Recovery simulation for one student in one of their classes.
 * The faculty member must own the class; the student_id is from that class.
 */
const getRecoveryProjection = async (req, res) => {
  const classId        = parseInt(req.query.class_id, 10);
  const studentId      = String(req.query.student_id).trim();
  const futureSessions = parseInt(req.query.future, 10);
  const targetRate     = parseFloat(req.query.target) || analyticsConfig.defaultRecoveryTarget;
  const from           = toDateString(req.query.from) || defaultFrom();
  const to             = toDateString(req.query.to)   || defaultTo();

  if (!req.user.isAdmin) {
    const owned = await classOwnership.isOwnClass(classId, req.user.id);
    if (!owned) {
      throw new ApiError(403, 'Access denied. That class is not assigned to you.');
    }
  }

  try {
    const data = await analyticsService.getRecoveryProjection(
      classId, studentId, futureSessions, targetRate, from, to,
    );
    return successResponse(res, data, 'Recovery projection');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 5. HOD department summary ─────────────────────────────────────────────────

/**
 * GET /api/analytics/attendance/hod?from=&to=
 *
 * HOD only. Department derived from req.user.departmentCode (server-trusted).
 * Client cannot override department by changing a query param.
 */
const getHODAttendanceSummary = async (req, res) => {
  const from = toDateString(req.query.from) || defaultFrom();
  const to   = toDateString(req.query.to)   || defaultTo();

  // Resolve department from the authenticated user's trusted departmentCode
  const departmentId = await sourceRepo.resolveDepartmentId(req.user.departmentCode);
  if (!departmentId) {
    throw new ApiError(400, `Department not found for code: ${req.user.departmentCode}`);
  }

  try {
    const data = await analyticsService.getDepartmentSummary(departmentId, from, to);
    return successResponse(res, data, 'Department attendance summary');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 6. Admin institution summary ──────────────────────────────────────────────

/**
 * GET /api/analytics/attendance/admin?from=&to=
 *
 * Admin only. Institution-wide aggregated summary grouped by department.
 */
const getAdminAttendanceSummary = async (req, res) => {
  const from = toDateString(req.query.from) || defaultFrom();
  const to   = toDateString(req.query.to)   || defaultTo();

  try {
    const data = await analyticsService.getInstitutionSummary(from, to);
    return successResponse(res, data, 'Institution attendance summary');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 7. Freshness / health ─────────────────────────────────────────────────────

/**
 * GET /api/analytics/attendance/freshness
 *
 * Any authenticated user. Returns the analytics metadata (last refresh time,
 * row counts, stale flag). Does not expose DB paths or error internals.
 */
const getFreshness = async (req, res) => {
  try {
    const meta = await refreshService.getMetadata();
    return successResponse(res, {
      lastSuccessfulRefreshAt: meta.lastSuccessfulRefreshAt,
      refreshStatus:           meta.refreshStatus,
      stale:                   meta.stale,
      loadedRowCount:          meta.loadedRowCount,
      refreshDurationMs:       meta.refreshDurationMs,
      analyticsAvailable:      meta.analyticsAvailable,
      duckdbState:             duckdbService.getStatus().state,
    }, 'Analytics freshness');
  } catch (err) {
    return handleAnalyticsError(err, res);
  }
};

// ── 8. Manual refresh (Admin only) ───────────────────────────────────────────

/**
 * POST /api/analytics/attendance/refresh
 *
 * Admin only. Triggers a synchronous refresh and waits for it to complete.
 * Does not expose error internals to the client.
 */
const triggerRefresh = async (req, res) => {
  const result = await refreshService.runRefresh();
  if (result.success) {
    return successResponse(res, {
      sourceRows:  result.sourceRows,
      loadedRows:  result.loadedRows,
      durationMs:  result.durationMs,
    }, 'Analytics refresh completed');
  }
  // Refresh failed — return controlled message without internal details
  return res.status(503).json({
    success:   false,
    message:   'Analytics refresh failed. Existing data is preserved.',
    code:      'REFRESH_FAILED',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getClassSummary,
  getStudentRisks,
  getAttendanceTrends,
  getRecoveryProjection,
  getHODAttendanceSummary,
  getAdminAttendanceSummary,
  getFreshness,
  triggerRefresh,
};

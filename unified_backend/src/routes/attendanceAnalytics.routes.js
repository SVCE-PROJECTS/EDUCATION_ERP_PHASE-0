/**
 * Attendance Analytics Routes
 *
 * Mounted at: /api/analytics/attendance
 * (added to routes/index.js alongside the existing /analytics/overview)
 *
 * All routes require JWT authentication.
 * Role-scoping is enforced inside the controller using the authenticated
 * user's server-trusted identity — never by client-supplied parameters.
 *
 * Route summary:
 *   GET  /summary     — Class attendance summary            (faculty / admin)
 *   GET  /risks       — Paginated student risk list         (faculty / admin)
 *   GET  /trends      — Date-bucketed attendance trend      (faculty / admin)
 *   GET  /recovery    — Recovery projection for one student (faculty / admin)
 *   GET  /hod         — Department-wide summary             (HOD only)
 *   GET  /admin       — Institution-wide summary            (Admin only)
 *   GET  /freshness   — Analytics metadata / health         (any authenticated user)
 *   POST /refresh     — Manual refresh trigger              (Admin only)
 */

'use strict';

const express      = require('express');
const router       = express.Router();

const { authenticate, requireHOD, requireAdmin } = require('../middleware/authenticate');
const { validate }  = require('../middleware/validate');
const asyncHandler  = require('../utils/asyncHandler');
const ctrl          = require('../controllers/attendanceAnalyticsController');
const {
  validateSummary,
  validateRisks,
  validateTrends,
  validateRecovery,
  validateHODSummary,
  validateAdminSummary,
} = require('../validators/attendanceAnalyticsValidator');

// All analytics routes require a valid JWT
router.use(authenticate);

// ── Faculty / Admin ───────────────────────────────────────────────────────────

router.get(
  '/summary',
  validate(validateSummary),
  asyncHandler(ctrl.getClassSummary),
);

router.get(
  '/risks',
  validate(validateRisks),
  asyncHandler(ctrl.getStudentRisks),
);

router.get(
  '/trends',
  validate(validateTrends),
  asyncHandler(ctrl.getAttendanceTrends),
);

router.get(
  '/recovery',
  validate(validateRecovery),
  asyncHandler(ctrl.getRecoveryProjection),
);

// ── HOD ───────────────────────────────────────────────────────────────────────

router.get(
  '/hod',
  requireHOD,
  validate(validateHODSummary),
  asyncHandler(ctrl.getHODAttendanceSummary),
);

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get(
  '/admin',
  requireAdmin,
  validate(validateAdminSummary),
  asyncHandler(ctrl.getAdminAttendanceSummary),
);

// ── Shared ────────────────────────────────────────────────────────────────────

router.get(
  '/freshness',
  asyncHandler(ctrl.getFreshness),
);

router.post(
  '/refresh',
  requireAdmin,
  asyncHandler(ctrl.triggerRefresh),
);

module.exports = router;

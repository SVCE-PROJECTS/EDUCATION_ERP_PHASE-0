/**
 * Attendance Analytics Service
 *
 * All calculations run against the DuckDB attendance_fact table.
 * None of these functions modify PostgreSQL or DuckDB; they are read-only.
 *
 * Risk bands are DEMO DEFAULTS — not verified VTU/SVCE policy.
 * Thresholds come from config/analytics.js and can be overridden via env vars.
 *
 * Division-by-zero: every percentage uses NULLIF(denominator, 0) in SQL,
 * and JavaScript fallbacks check for null/zero explicitly.
 */

'use strict';

const duckdb          = require('./duckdbService');
const refreshService  = require('./analyticsRefreshService');
const analyticsConfig = require('../../config/analytics');

// ── Risk band helpers ─────────────────────────────────────────────────────────

const getRiskBand = (pct) => {
  if (pct === null || pct === undefined) return 'insufficient_data';
  if (pct < analyticsConfig.thresholds.critical) return 'critical';
  if (pct < analyticsConfig.thresholds.atRisk)   return 'at_risk';
  return 'on_track';
};

const getRiskExplanation = (band, pct, threshold) => {
  switch (band) {
    case 'critical':
      return `Attendance is ${pct.toFixed(1)}%, below the critical threshold of ${analyticsConfig.thresholds.critical}%. `
           + 'Verify records and consider contacting the student through the institution\'s normal process.';
    case 'at_risk':
      return `Attendance is ${pct.toFixed(1)}%, below the target of ${analyticsConfig.thresholds.atRisk}%. `
           + 'The student may need to increase attendance to reach the target.';
    case 'on_track':
      return `Attendance is ${pct.toFixed(1)}%, meeting or exceeding the ${analyticsConfig.thresholds.atRisk}% target.`;
    default:
      return 'Insufficient data to determine attendance status.';
  }
};

// ── Class summary ─────────────────────────────────────────────────────────────

/**
 * Overall attendance summary for one class in a date range.
 *
 * @param {number} classId
 * @param {string} from    — ISO date string YYYY-MM-DD (inclusive)
 * @param {string} to      — ISO date string YYYY-MM-DD (inclusive)
 * @returns {{ recordedRows, presentRows, absentRows, attendancePercentage, riskBands, freshness }}
 */
const getClassSummary = async (classId, from, to) => {
  const [rows, studentRisk, freshness] = await Promise.all([
    duckdb.query(
      `SELECT
         COUNT(*)::BIGINT                                         AS recorded_rows,
         COUNT(*) FILTER (WHERE status = 'Present')::BIGINT      AS present_rows,
         COUNT(*) FILTER (WHERE status = 'Absent')::BIGINT       AS absent_rows
       FROM attendance_fact
       WHERE class_id = $1
         AND attendance_date >= $2::DATE
         AND attendance_date <= $3::DATE`,
      [classId, from, to],
    ),
    _getRiskBandCounts(classId, from, to),
    refreshService.getMetadata(),
  ]);

  const r = rows[0] || {};
  const recorded = Number(r.recorded_rows ?? 0);
  const present  = Number(r.present_rows  ?? 0);
  const absent   = Number(r.absent_rows   ?? 0);
  const pct      = recorded > 0 ? (present / recorded) * 100 : null;

  return {
    classId,
    range: { from, to },
    summary: {
      recordedRows:         recorded,
      presentRows:          present,
      absentRows:           absent,
      attendancePercentage: pct !== null ? Math.round(pct * 100) / 100 : null,
    },
    riskBands:  studentRisk,
    thresholds: {
      critical: analyticsConfig.thresholds.critical,
      atRisk:   analyticsConfig.thresholds.atRisk,
      note:     'Demo defaults — not official VTU/SVCE policy',
    },
    freshness,
  };
};

const _getRiskBandCounts = async (classId, from, to) => {
  const rows = await duckdb.query(
    `SELECT
       student_id,
       COUNT(*)::BIGINT                                     AS total,
       COUNT(*) FILTER (WHERE status = 'Present')::BIGINT  AS present
     FROM attendance_fact
     WHERE class_id = $1
       AND attendance_date >= $2::DATE
       AND attendance_date <= $3::DATE
     GROUP BY student_id`,
    [classId, from, to],
  );

  let critical = 0, atRisk = 0, onTrack = 0, insufficient = 0;
  for (const row of rows) {
    const total   = Number(row.total   ?? 0);
    const present = Number(row.present ?? 0);
    const pct     = total > 0 ? (present / total) * 100 : null;
    const band    = getRiskBand(pct);
    if (band === 'critical')          critical++;
    else if (band === 'at_risk')      atRisk++;
    else if (band === 'on_track')     onTrack++;
    else                              insufficient++;
  }

  return { critical, atRisk, onTrack, insufficient };
};

// ── Student risk list ─────────────────────────────────────────────────────────

/**
 * Paginated list of students with their attendance %, risk band and explanation.
 *
 * @param {number} classId
 * @param {string} from
 * @param {string} to
 * @param {{ page, pageSize, riskBandFilter? }} opts
 */
const getStudentRiskList = async (classId, from, to, opts = {}) => {
  const page     = Math.max(1, opts.page     || 1);
  const pageSize = Math.min(
    Math.max(1, opts.pageSize || analyticsConfig.defaultPageSize),
    analyticsConfig.maxPageSize,
  );
  const offset   = (page - 1) * pageSize;

  const rows = await duckdb.query(
    `SELECT
       student_id,
       COUNT(*)::BIGINT                                     AS total,
       COUNT(*) FILTER (WHERE status = 'Present')::BIGINT  AS present
     FROM attendance_fact
     WHERE class_id = $1
       AND attendance_date >= $2::DATE
       AND attendance_date <= $3::DATE
     GROUP BY student_id
     ORDER BY (COUNT(*) FILTER (WHERE status = 'Present') * 1.0 / NULLIF(COUNT(*), 0)) ASC NULLS LAST,
              student_id ASC`,
    [classId, from, to],
  );

  // Annotate with risk band
  const annotated = rows.map((row) => {
    const total   = Number(row.total   ?? 0);
    const present = Number(row.present ?? 0);
    const pct     = total > 0 ? (present / total) * 100 : null;
    const band    = getRiskBand(pct);
    return {
      studentId:            row.student_id,
      recordedSessions:     total,
      presentSessions:      present,
      attendancePercentage: pct !== null ? Math.round(pct * 100) / 100 : null,
      riskBand:             band,
      explanation:          getRiskExplanation(band, pct, analyticsConfig.thresholds),
    };
  });

  // Optional client-side risk band filter
  const filtered = opts.riskBandFilter
    ? annotated.filter((r) => r.riskBand === opts.riskBandFilter)
    : annotated;

  const total = filtered.length;
  const data  = filtered.slice(offset, offset + pageSize);

  const freshness = await refreshService.getMetadata();

  return {
    classId,
    range: { from, to },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    students: data,
    thresholds: {
      critical: analyticsConfig.thresholds.critical,
      atRisk:   analyticsConfig.thresholds.atRisk,
      note:     'Demo defaults — not official VTU/SVCE policy',
    },
    freshness,
  };
};

// ── Attendance trend ──────────────────────────────────────────────────────────

/**
 * Date-bucketed attendance trend for a class (one row per date with attendance).
 *
 * @param {number} classId
 * @param {string} from
 * @param {string} to
 * @returns {{ trend: [{ date, presentRows, totalRows, attendancePercentage }] }}
 */
const getAttendanceTrend = async (classId, from, to) => {
  const rows = await duckdb.query(
    `SELECT
       attendance_date::VARCHAR                             AS attendance_date,
       COUNT(*)::BIGINT                                    AS total_rows,
       COUNT(*) FILTER (WHERE status = 'Present')::BIGINT AS present_rows
     FROM attendance_fact
     WHERE class_id = $1
       AND attendance_date >= $2::DATE
       AND attendance_date <= $3::DATE
     GROUP BY attendance_date
     ORDER BY attendance_date ASC`,
    [classId, from, to],
  );

  const trend = rows.map((r) => {
    const total   = Number(r.total_rows   ?? 0);
    const present = Number(r.present_rows ?? 0);
    return {
      date:                 String(r.attendance_date).slice(0, 10),
      totalRows:            total,
      presentRows:          present,
      absentRows:           total - present,
      attendancePercentage: total > 0 ? Math.round((present / total) * 10000) / 100 : null,
    };
  });

  const freshness = await refreshService.getMetadata();

  return { classId, range: { from, to }, trend, freshness };
};

// ── Recovery simulator ────────────────────────────────────────────────────────

/**
 * Calculate minimum future sessions a student must attend to hit a target rate.
 *
 * Formula:  max(0, ceil( (R*T - P) / (1 - R) ))
 * Special case R = 1: all future sessions must be attended unless P = T already.
 *
 * @param {number} classId
 * @param {string} studentId
 * @param {number} futureSessions  — planned sessions remaining
 * @param {number} targetRate      — decimal 0–1 (e.g. 0.75)
 * @param {string} from
 * @param {string} to
 */
const getRecoveryProjection = async (classId, studentId, futureSessions, targetRate, from, to) => {
  // Validate inputs
  const F = Math.max(0, Math.round(futureSessions));
  const R = Math.max(0, Math.min(1, targetRate));

  const rows = await duckdb.query(
    `SELECT
       COUNT(*)::BIGINT                                     AS total,
       COUNT(*) FILTER (WHERE status = 'Present')::BIGINT  AS present
     FROM attendance_fact
     WHERE class_id = $1
       AND student_id = $2
       AND attendance_date >= $3::DATE
       AND attendance_date <= $4::DATE`,
    [classId, studentId, from, to],
  );

  const P = Number(rows[0]?.present ?? 0);
  const T = Number(rows[0]?.total   ?? 0);

  // Current percentage
  const currentPct = T > 0 ? (P / T) * 100 : null;
  const targetPct  = R * 100;

  let minSessionsNeeded;
  let canReachTarget;
  let explanation;

  if (T === 0) {
    minSessionsNeeded = 0;
    canReachTarget    = F > 0 && R <= 1;
    explanation       = 'No attendance recorded yet in this range.';
  } else if (R >= 1) {
    // Target is 100% — need all future sessions AND mustn't have any absences already
    if (P === T) {
      minSessionsNeeded = F;
      canReachTarget    = true;
      explanation       = 'Currently at 100%. Must attend all remaining sessions to stay at 100%.';
    } else {
      minSessionsNeeded = F;
      canReachTarget    = false;
      explanation       = `Target of 100% is no longer achievable — there are already ${T - P} absent session(s).`;
    }
  } else {
    const needed = (R * T - P) / (1 - R);
    minSessionsNeeded = Math.max(0, Math.ceil(needed));
    canReachTarget    = minSessionsNeeded <= F;
    if (minSessionsNeeded === 0) {
      explanation = `Target already met (${currentPct !== null ? currentPct.toFixed(1) : '?'}% ≥ ${targetPct}%). No additional attendance required.`;
    } else if (canReachTarget) {
      explanation = `Must attend at least ${minSessionsNeeded} of the remaining ${F} session(s) to reach ${targetPct}%.`;
    } else {
      explanation = `Cannot reach ${targetPct}% with ${F} remaining session(s) — would need at least ${minSessionsNeeded}. `
                  + 'Verify records for accuracy.';
    }
  }

  const freshness = await refreshService.getMetadata();

  return {
    classId,
    studentId,
    range: { from, to },
    inputs: {
      presentSessions:  P,
      recordedSessions: T,
      futureSessions:   F,
      targetRate:       R,
      targetPercentage: targetPct,
    },
    result: {
      currentPercentage: currentPct !== null ? Math.round(currentPct * 100) / 100 : null,
      minSessionsNeeded,
      canReachTarget,
      explanation,
    },
    disclaimer: 'This is a projection based on recorded data. It assumes future sessions occur as specified and that all attendance records are accurate.',
    freshness,
  };
};

// ── Department summary (HOD) ──────────────────────────────────────────────────

/**
 * Department-wide attendance summary for HOD portal.
 * Returns per-class aggregates for all classes in the department.
 *
 * @param {number} departmentId
 * @param {string} from
 * @param {string} to
 */
const getDepartmentSummary = async (departmentId, from, to) => {
  const rows = await duckdb.query(
    `SELECT
       class_id,
       COUNT(*)::BIGINT                                     AS total,
       COUNT(*) FILTER (WHERE status = 'Present')::BIGINT  AS present,
       COUNT(DISTINCT student_id)::BIGINT                  AS distinct_students
     FROM attendance_fact
     WHERE department_id = $1
       AND attendance_date >= $2::DATE
       AND attendance_date <= $3::DATE
     GROUP BY class_id
     ORDER BY class_id`,
    [departmentId, from, to],
  );

  // Overall aggregates
  let totalRecorded = 0, totalPresent = 0;
  const classes = rows.map((r) => {
    const total   = Number(r.total   ?? 0);
    const present = Number(r.present ?? 0);
    totalRecorded += total;
    totalPresent  += present;
    const pct  = total > 0 ? (present / total) * 100 : null;
    const band = getRiskBand(pct);
    return {
      classId:              Number(r.class_id),
      recordedSessions:     total,
      presentSessions:      present,
      distinctStudents:     Number(r.distinct_students ?? 0),
      attendancePercentage: pct !== null ? Math.round(pct * 100) / 100 : null,
      overallBand:          band,
    };
  });

  const overallPct = totalRecorded > 0
    ? Math.round((totalPresent / totalRecorded) * 10000) / 100
    : null;

  const freshness = await refreshService.getMetadata();

  return {
    departmentId,
    range: { from, to },
    overall: {
      recordedSessions:     totalRecorded,
      presentSessions:      totalPresent,
      attendancePercentage: overallPct,
    },
    classes,
    freshness,
  };
};

// ── Institution summary (Admin) ───────────────────────────────────────────────

/**
 * Institution-wide aggregated summary grouped by department.
 *
 * @param {string} from
 * @param {string} to
 */
const getInstitutionSummary = async (from, to) => {
  const rows = await duckdb.query(
    `SELECT
       department_id,
       COUNT(*)::BIGINT                                     AS total,
       COUNT(*) FILTER (WHERE status = 'Present')::BIGINT  AS present,
       COUNT(DISTINCT student_id)::BIGINT                  AS distinct_students,
       COUNT(DISTINCT class_id)::BIGINT                    AS distinct_classes
     FROM attendance_fact
     WHERE attendance_date >= $1::DATE
       AND attendance_date <= $2::DATE
     GROUP BY department_id
     ORDER BY department_id`,
    [from, to],
  );

  let grandTotal = 0, grandPresent = 0;
  const departments = rows.map((r) => {
    const total   = Number(r.total   ?? 0);
    const present = Number(r.present ?? 0);
    grandTotal   += total;
    grandPresent += present;
    const pct = total > 0 ? (present / total) * 100 : null;
    return {
      departmentId:         Number(r.department_id),
      recordedSessions:     total,
      presentSessions:      present,
      distinctStudents:     Number(r.distinct_students ?? 0),
      distinctClasses:      Number(r.distinct_classes  ?? 0),
      attendancePercentage: pct !== null ? Math.round(pct * 100) / 100 : null,
    };
  });

  const overallPct = grandTotal > 0
    ? Math.round((grandPresent / grandTotal) * 10000) / 100
    : null;

  const freshness = await refreshService.getMetadata();

  return {
    range: { from, to },
    overall: {
      recordedSessions:     grandTotal,
      presentSessions:      grandPresent,
      attendancePercentage: overallPct,
    },
    departments,
    freshness,
  };
};

module.exports = {
  getClassSummary,
  getStudentRiskList,
  getAttendanceTrend,
  getRecoveryProjection,
  getDepartmentSummary,
  getInstitutionSummary,
  getRiskBand,           // exported for tests
};

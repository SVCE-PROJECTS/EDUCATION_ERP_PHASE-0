/**
 * Pure calculation helpers extracted from attendanceAnalyticsService for
 * isolated unit testing without any database dependency.
 */

'use strict';

// These must stay in sync with config/analytics.js thresholds.
// Tests override via process.env before requiring this module.

const getCritical = () => parseFloat(process.env.ATTENDANCE_THRESHOLD_CRITICAL || '0.60') * 100;
const getAtRisk   = () => parseFloat(process.env.ATTENDANCE_THRESHOLD_AT_RISK   || '0.75') * 100;

/**
 * Classify an attendance percentage into a risk band.
 * @param {number|null} pct — percentage 0–100, or null for missing data
 * @returns {'critical'|'at_risk'|'on_track'|'insufficient_data'}
 */
const getRiskBand = (pct) => {
  if (pct === null || pct === undefined) return 'insufficient_data';
  if (pct < getCritical()) return 'critical';
  if (pct < getAtRisk())   return 'at_risk';
  return 'on_track';
};

/**
 * Calculate recovery requirements.
 *
 * Formula: max(0, ceil( (R*T - P) / (1 - R) ))
 * Special case R >= 1: all future sessions needed; impossible if there are
 * already any absences.
 *
 * @param {number} P — sessions attended so far
 * @param {number} T — sessions recorded so far
 * @param {number} F — future sessions remaining
 * @param {number} R — target rate (decimal, clamped to 0–1)
 * @returns {{ minSessionsNeeded, canReachTarget, currentPct }}
 */
const calcRecovery = (P, T, F, R) => {
  // Clamp inputs
  R = Math.max(0, Math.min(1, R));
  F = Math.max(0, F);
  T = Math.max(0, T);
  P = Math.max(0, Math.min(T, P));

  const currentPct = T > 0 ? (P / T) * 100 : null;

  if (T === 0) {
    return { minSessionsNeeded: 0, canReachTarget: F > 0 || R === 0, currentPct };
  }

  if (R >= 1) {
    if (P === T) {
      return { minSessionsNeeded: F, canReachTarget: true, currentPct };
    }
    return { minSessionsNeeded: F, canReachTarget: false, currentPct };
  }

  const needed = (R * T - P) / (1 - R);
  const minSessionsNeeded = Math.max(0, Math.ceil(needed));
  return {
    minSessionsNeeded,
    canReachTarget: minSessionsNeeded <= F,
    currentPct,
  };
};

module.exports = { getRiskBand, calcRecovery };

/**
 * Attendance Analytics Service — Faculty Portal
 *
 * Calls the analytics endpoints added in Step C.
 * All data comes from the backend's DuckDB analytical layer.
 * The backend enforces class ownership; this service never sends
 * a department_id, faculty_id, or role claim as proof of access.
 *
 * Response envelope from backend:
 *   { success: true, data: <payload>, message: string, timestamp: string }
 */

import api from './api';

// ── Shared types ───────────────────────────────────────────────────────────────

export type RiskBand = 'critical' | 'at_risk' | 'on_track' | 'insufficient_data';

export interface Freshness {
  lastSuccessfulRefreshAt: string | null;
  refreshStatus: string;
  stale: boolean;
  loadedRowCount: number;
  analyticsAvailable: boolean;
}

export interface Thresholds {
  critical: number;
  atRisk: number;
  note: string;
}

// ── Class summary ──────────────────────────────────────────────────────────────

export interface ClassSummary {
  classId: number;
  range: { from: string; to: string };
  summary: {
    recordedRows: number;
    presentRows: number;
    absentRows: number;
    attendancePercentage: number | null;
  };
  riskBands: {
    critical: number;
    atRisk: number;
    onTrack: number;
    insufficient: number;
  };
  thresholds: Thresholds;
  freshness: Freshness;
}

// ── Student risk list ──────────────────────────────────────────────────────────

export interface StudentRiskRow {
  studentId: string;
  recordedSessions: number;
  presentSessions: number;
  attendancePercentage: number | null;
  riskBand: RiskBand;
  explanation: string;
}

export interface StudentRiskList {
  classId: number;
  range: { from: string; to: string };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  students: StudentRiskRow[];
  thresholds: Thresholds;
  freshness: Freshness;
}

// ── Trend ─────────────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  totalRows: number;
  presentRows: number;
  absentRows: number;
  attendancePercentage: number | null;
}

export interface AttendanceTrend {
  classId: number;
  range: { from: string; to: string };
  trend: TrendPoint[];
  freshness: Freshness;
}

// ── Recovery ──────────────────────────────────────────────────────────────────

export interface RecoveryProjection {
  classId: number;
  studentId: string;
  range: { from: string; to: string };
  inputs: {
    presentSessions: number;
    recordedSessions: number;
    futureSessions: number;
    targetRate: number;
    targetPercentage: number;
  };
  result: {
    currentPercentage: number | null;
    minSessionsNeeded: number;
    canReachTarget: boolean;
    explanation: string;
  };
  disclaimer: string;
  freshness: Freshness;
}

// ── Freshness ─────────────────────────────────────────────────────────────────

export interface FreshnessInfo {
  lastSuccessfulRefreshAt: string | null;
  refreshStatus: string;
  stale: boolean;
  loadedRowCount: number;
  refreshDurationMs: number;
  analyticsAvailable: boolean;
  duckdbState: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export interface SummaryParams {
  classId: number;
  from: string;
  to: string;
}

export interface RisksParams extends SummaryParams {
  page?: number;
  pageSize?: number;
  riskBand?: RiskBand;
}

export interface TrendsParams extends SummaryParams {}

export interface RecoveryParams extends SummaryParams {
  studentId: string;
  future: number;
  target?: number;
}

const unwrap = <T>(res: any): T => res.data?.data ?? res.data;

export const attendanceAnalyticsService = {
  /** Class-level attendance summary with risk band counts */
  getSummary: async (p: SummaryParams): Promise<ClassSummary> => {
    const res = await api.get('/analytics/attendance/summary', {
      params: { class_id: p.classId, from: p.from, to: p.to },
    });
    return unwrap<ClassSummary>(res);
  },

  /** Paginated student risk list */
  getRisks: async (p: RisksParams): Promise<StudentRiskList> => {
    const res = await api.get('/analytics/attendance/risks', {
      params: {
        class_id: p.classId,
        from: p.from,
        to: p.to,
        page: p.page ?? 1,
        pageSize: p.pageSize ?? 50,
        ...(p.riskBand ? { riskBand: p.riskBand } : {}),
      },
    });
    return unwrap<StudentRiskList>(res);
  },

  /** Date-bucketed attendance trend */
  getTrends: async (p: TrendsParams): Promise<AttendanceTrend> => {
    const res = await api.get('/analytics/attendance/trends', {
      params: { class_id: p.classId, from: p.from, to: p.to },
    });
    return unwrap<AttendanceTrend>(res);
  },

  /** Recovery projection for one student */
  getRecovery: async (p: RecoveryParams): Promise<RecoveryProjection> => {
    const res = await api.get('/analytics/attendance/recovery', {
      params: {
        class_id: p.classId,
        student_id: p.studentId,
        future: p.future,
        target: p.target ?? 0.75,
        from: p.from,
        to: p.to,
      },
    });
    return unwrap<RecoveryProjection>(res);
  },

  /** Analytics metadata / freshness */
  getFreshness: async (): Promise<FreshnessInfo> => {
    const res = await api.get('/analytics/attendance/freshness');
    return unwrap<FreshnessInfo>(res);
  },
};

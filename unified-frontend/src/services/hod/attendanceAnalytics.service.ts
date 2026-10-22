/**
 * HOD Attendance Analytics Service
 *
 * Calls GET /api/analytics/attendance/hod
 * The backend derives the department from the authenticated HOD's server-side
 * identity. This service never sends a department_id as a claim.
 */

import api from './api';

export interface HODDeptSummary {
  departmentId: number;
  range: { from: string; to: string };
  overall: {
    recordedSessions: number;
    presentSessions: number;
    attendancePercentage: number | null;
  };
  classes: Array<{
    classId: number;
    recordedSessions: number;
    presentSessions: number;
    distinctStudents: number;
    attendancePercentage: number | null;
    overallBand: string;
  }>;
  freshness: {
    lastSuccessfulRefreshAt: string | null;
    refreshStatus: string;
    stale: boolean;
    loadedRowCount: number;
    analyticsAvailable: boolean;
  };
}

const unwrap = <T>(res: any): T => res.data?.data ?? res.data;

export const hodAttendanceAnalyticsService = {
  getDeptSummary: async (from: string, to: string): Promise<HODDeptSummary> => {
    const res = await api.get('/analytics/attendance/hod', {
      params: { from, to },
    });
    return unwrap<HODDeptSummary>(res);
  },
};

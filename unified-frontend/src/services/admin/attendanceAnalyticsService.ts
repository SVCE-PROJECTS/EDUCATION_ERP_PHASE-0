/**
 * Admin Attendance Analytics Service
 *
 * Calls GET /api/analytics/attendance/admin
 * Returns institution-wide aggregated attendance grouped by department.
 * Uses the shared axiosInstance (admin portal pattern) which returns
 * response.data directly (not the full Axios response).
 */

// @ts-nocheck
import axiosInstance from '../../api/axiosInstance';

export interface AdminInstitutionSummary {
  range: { from: string; to: string };
  overall: {
    recordedSessions: number;
    presentSessions: number;
    attendancePercentage: number | null;
  };
  departments: Array<{
    departmentId: number;
    recordedSessions: number;
    presentSessions: number;
    distinctStudents: number;
    distinctClasses: number;
    attendancePercentage: number | null;
  }>;
  freshness: {
    lastSuccessfulRefreshAt: string | null;
    refreshStatus: string;
    stale: boolean;
    loadedRowCount: number;
    analyticsAvailable: boolean;
  };
}

export const fetchAdminAttendanceSummary = async (
  from: string,
  to: string,
): Promise<AdminInstitutionSummary> => {
  // axiosInstance returns response.data directly (see api/axiosInstance.ts)
  const result: any = await axiosInstance.get('/analytics/attendance/admin', {
    params: { from, to },
  });
  return result?.data ?? result;
};

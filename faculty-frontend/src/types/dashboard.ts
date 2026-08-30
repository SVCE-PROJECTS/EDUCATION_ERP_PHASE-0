/**
 * Dashboard types — derived from:
 *   unified_backend/src/controllers/dashboardController.js
 *
 * GET /api/dashboard/stats
 * GET /api/dashboard/weekly-attendance
 */

/**
 * Response from GET /api/dashboard/stats
 */
export interface DashboardStats {
  totalStudents: number;
  attendancePercent: number;
  totalAssignments: number;
  openAssignments: number;
  iaAverage: number;
  recentActivities: string[];
}

/**
 * One day entry from GET /api/dashboard/weekly-attendance
 */
export interface WeeklyAttendanceDay {
  date: string;   // 'YYYY-MM-DD'
  day: string;    // 'Mon', 'Tue', …
  percent: number;
  present: number;
  total: number;
}

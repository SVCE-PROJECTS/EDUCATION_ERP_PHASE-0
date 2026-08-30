/**
 * Dashboard API
 *
 * Backend: unified_backend/src/routes/dashboard.routes.js
 *          unified_backend/src/controllers/dashboardController.js
 *
 * Endpoints:
 *   GET /api/dashboard/stats             — global counts & averages
 *   GET /api/dashboard/weekly-attendance — per-day % for last 7 days
 *
 * Note: /api/dashboard/hod is HOD-only; Faculty portal uses /stats and
 * /weekly-attendance.
 *
 * All routes require Bearer token.
 */

import axiosInstance from '../api/axiosInstance';
import type { DashboardStats, WeeklyAttendanceDay } from '../types';

/**
 * GET /api/dashboard/stats
 * Returns global totals — not scoped to a single faculty's classes.
 * Response shape (direct JSON, no wrapper):
 *   { totalStudents, attendancePercent, totalAssignments,
 *     openAssignments, iaAverage, recentActivities }
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await axiosInstance.get<never, DashboardStats>(
    '/dashboard/stats',
  );
  return response;
};

/**
 * GET /api/dashboard/weekly-attendance
 * Returns last 7 days (today inclusive) with per-day attendance %.
 * Response: array of WeeklyAttendanceDay objects, sorted date ASC.
 */
export const getWeeklyAttendance = async (): Promise<WeeklyAttendanceDay[]> => {
  const response = await axiosInstance.get<never, WeeklyAttendanceDay[]>(
    '/dashboard/weekly-attendance',
  );
  return response;
};

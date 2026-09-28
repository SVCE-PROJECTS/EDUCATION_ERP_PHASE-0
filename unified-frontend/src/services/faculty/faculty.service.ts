/**
 * Faculty Portal — Faculty & Dashboard Service
 * Dashboard: GET /api/dashboard/stats returns flat JSON (no .data wrapper)
 *   { totalStudents, attendancePercent, totalAssignments, openAssignments, iaAverage, recentActivities }
 */
import api from './api';

export const facultyService = {
  getById: async (id: string) => {
    const res = await api.get(`/faculty/${id}`);
    return res.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    // Returns flat JSON directly — no .data wrapper
    return res.data;
  },
};

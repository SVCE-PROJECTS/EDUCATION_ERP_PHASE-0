import api from './api';

// All requests go through the shared axios instance which automatically
// attaches the logged-in HOD's JWT via the request interceptor in api.ts.

const studentListService = {
  /**
   * GET /api/hod/student-list/semesters
   * Returns { semesterType, academicYear, semesters: [1,3,5,7] }
   */
  getSemesters: async () => {
    const res = await api.get('/hod/student-list/semesters');
    return res.data;
  },

  /**
   * GET /api/hod/student-list/:semester/sections
   * Returns [{ id, name }]
   */
  getSections: async (semester: number | string) => {
    const res = await api.get(`/hod/student-list/${semester}/sections`);
    return res.data;
  },

  /**
   * GET /api/hod/student-list/:semester/:section
   * Returns { semester, section, timetable, subjectFacultyMapping, students: { data, pagination } }
   * Supports optional ?page=1&limit=50
   */
  getSectionDashboard: async (
    semester: number | string,
    section: string,
    page = 1,
    limit = 50
  ) => {
    const res = await api.get(`/hod/student-list/${semester}/${section}`, {
      params: { page, limit },
    });
    return res.data;
  },
};

export default studentListService;

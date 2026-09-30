import api from './api';

/**
 * allocationService — Faculty ⇄ Subject/Class allocation.
 *
 * IMPORTANT (frontend-only change):
 * The three endpoints below (`GET/POST/DELETE /hod/faculty/:facultyId/allocations`)
 * do not exist in the current backend yet. This service is wired to call them
 * using the same request/response shape as the rest of the app's services
 * (`ApiResponse<T>` envelope, JWT via the shared `api` instance), so the HOD
 * Faculty Allocation screen is fully functional as soon as they are added
 * server-side. Nothing else in the app depends on these — the dropdowns for
 * "class" and "subject" are populated entirely from the existing
 * `studentListService` endpoints (semesters → sections → section timetable),
 * so no backend change is required just to browse/select values.
 *
 * Suggested backend contract (for whoever wires this up):
 *   GET    /api/hod/faculty/:facultyId/allocations
 *          → { success, data: FacultyAllocation[] }
 *   POST   /api/hod/faculty/:facultyId/allocations
 *          body: { semester, section, subject, subjectCode }
 *          → { success, data: FacultyAllocation }
 *   DELETE /api/hod/faculty/:facultyId/allocations/:allocationId
 *          → { success }
 */

export interface FacultyAllocation {
  id: string;
  facultyId: string;
  semester: number;
  section: string;
  subject: string;
  subjectCode: string;
  createdAt?: string;
}

export interface CreateAllocationPayload {
  semester: number;
  section: string;
  subject: string;
  subjectCode: string;
}

export const allocationService = {
  getForFaculty: async (facultyId: string) => {
    const res = await api.get(`/hod/faculty/${facultyId}/allocations`);
    return res.data;
  },

  create: async (facultyId: string, payload: CreateAllocationPayload) => {
    const res = await api.post(`/hod/faculty/${facultyId}/allocations`, payload);
    return res.data;
  },

  remove: async (facultyId: string, allocationId: string) => {
    const res = await api.delete(`/hod/faculty/${facultyId}/allocations/${allocationId}`);
    return res.data;
  },
};

export default allocationService;

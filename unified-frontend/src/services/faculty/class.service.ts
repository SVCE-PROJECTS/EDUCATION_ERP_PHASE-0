/**
 * Class Service - Faculty Portal
 * Handles fetching classes assigned to the logged-in faculty.
 *
 * Backend: GET /api/faculty/me/classes
 * Response shape: { success: true, data: [...rows] }  (successResponse wrapper)
 * Each row: { class_id, subject_name, subject_code, section_name, semester_number, ... }
 */
import api from './api';

export interface FacultyClass {
  class_id: number;
  subject_code: string;
  subject_name: string;
  semester: number;   // mapped from semester_number
  section: string;    // mapped from section_name
  label: string;      // human-readable label for pickers
}

export const classService = {
  getMyClasses: async (): Promise<FacultyClass[]> => {
    try {
      const res = await api.get('/faculty/me/classes');
      // Backend wraps via successResponse → { success, data: [...] }
      const rows: any[] = res.data?.data ?? res.data?.classes ?? (Array.isArray(res.data) ? res.data : []);

      return rows.map((c: any) => ({
        class_id:     Number(c.class_id),
        subject_code: c.subject_code  ?? '',
        subject_name: c.subject_name  ?? '',
        semester:     Number(c.semester_number ?? c.semester ?? 0),
        section:      (c.section_name ?? c.section ?? '').trim(),
        label: `${c.subject_name} (${c.subject_code}) · Sec ${c.section_name ?? c.section} · Sem ${c.semester_number ?? c.semester}`,
      }));
    } catch (error) {
      console.error('[classService] Failed to fetch classes:', error);
      return [];
    }
  },
};

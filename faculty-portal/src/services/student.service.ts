/**
 * Faculty Portal — Student Service
 * GET /api/students/by-section/:semester/:section
 *
 * DB truth: attendance.student_id and ia_marks.student_id are
 * VARCHAR(50) referencing students(library_id) — the USN string.
 * We must send library_id (e.g. "1CS21CS001") as student_id, NOT an integer.
 */
import api from './api';

export interface StudentOption {
  student_id: string;   // library_id / USN — the FK value used everywhere
  usn: string;
  name: string;
  label: string;        // "Arjun Kumar (1CS21CS001)"
}

export const studentService = {
  getBySemesterSection: async (semester: number, section: string): Promise<StudentOption[]> => {
    try {
      const res = await api.get(`/students/by-section/${semester}/${section}`);
      const rows: any[] = res.data?.students ?? (Array.isArray(res.data) ? res.data : []);
      return rows.map((s: any) => ({
        student_id: String(s.library_id ?? s.usn ?? s.student_id ?? ''),
        usn:        s.usn        ?? '',
        name:       s.name       ?? '',
        label:      `${s.name ?? 'Unknown'} (${s.usn ?? s.library_id ?? ''})`,
      }));
    } catch (err) {
      console.error('[studentService] getBySemesterSection failed:', err);
      return [];
    }
  },
};

/**
 * Faculty Portal — Student Service
 * GET /api/students/by-section/:semester/:section
 * Returns students with numeric_id (actual PK needed for attendance/ia_marks FKs)
 */
import api from './api';

export interface StudentOption {
  numeric_id: number;   // students.student_id PK — required for attendance/ia_marks
  usn: string;
  name: string;
  label: string;        // "Arjun Kumar (1CS21CS001)"
}

export const studentService = {
  getBySemesterSection: async (semester: number, section: string): Promise<StudentOption[]> => {
    try {
      const res = await api.get(`/students/by-section/${semester}/${section}`);
      const rows: any[] = res.data?.students ?? [];
      return rows.map((s: any) => ({
        numeric_id: Number(s.numeric_id),
        usn:        s.usn ?? '',
        name:       s.name ?? '',
        label:      `${s.name} (${s.usn ?? ''})`,
      }));
    } catch {
      return [];
    }
  },
};

import api from './api';

// Backs the name-autocomplete used when adding a student to an activity
// (e.g. Real-Time Industry Projects). Mirrors GET /api/students/search,
// which is already scoped server-side to the caller's own department.
export interface StudentSearchResult {
  library_id: string | number;
  name: string;
  usn: string;
  semester_number?: number | null;
  section_name?: string | null;
}

export const searchStudentsByName = async (name: string): Promise<StudentSearchResult[]> => {
  const res = await api.get('/students/search', { params: { name } });
  return res.data?.data ?? [];
};

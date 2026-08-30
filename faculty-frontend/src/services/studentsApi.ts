/**
 * Students API
 *
 * Backend: unified_backend/src/routes/student.routes.js
 *          unified_backend/src/controllers/studentController.js
 *
 * Endpoints used by Faculty Portal:
 *   GET /api/students/by-section/:semester/:section  — students for attendance/marks
 *   GET /api/students/:id/profile                    — comprehensive student profile
 *   GET /api/students/:id                            — basic student record
 *   GET /api/students                                — simple list (with optional search)
 *   GET /api/students/semesters                      — available semesters
 *   GET /api/students/semesters/:semester/sections   — sections for a semester
 *   GET /api/students/semesters/:semester/sections/:section — section dashboard (incl. timetable)
 */

import axiosInstance from '../api/axiosInstance';
import type {
  StudentBrief,
  Student,
  StudentProfile,
  SemesterOption,
  SectionOption,
} from '../types';
import type { SectionDashboard } from '../types/timetable';

/**
 * GET /api/students/by-section/:semester/:section
 * Returns students for the given semester number + section name.
 * Response: { students: StudentBrief[] }
 *
 * Used by: Attendance screen, IA Marks screen (to list students).
 */
export const getStudentsBySection = async (
  semester: number,
  section: string,
): Promise<StudentBrief[]> => {
  const response = await axiosInstance.get<never, { students: StudentBrief[] }>(
    `/students/by-section/${semester}/${section}`,
  );
  return response.students;
};

/**
 * GET /api/students/:id/profile
 * :id is the student's library_id string.
 * Returns comprehensive profile including attendance summary, IA marks,
 * assignments, and achievements.
 */
export const getStudentProfile = async (
  libraryId: string,
): Promise<StudentProfile> => {
  const response = await axiosInstance.get<never, StudentProfile>(
    `/students/${libraryId}/profile`,
  );
  return response;
};

/**
 * GET /api/students/:id
 * :id is the student's library_id string.
 * Returns basic student record.
 */
export const getStudentById = async (libraryId: string): Promise<Student> => {
  const response = await axiosInstance.get<never, { success: boolean; data: Student }>(
    `/students/${libraryId}`,
  );
  // Admin-erp uses success() wrapper; faculty_student uses direct JSON
  // Handle both shapes safely
  return (response as unknown as { data: Student }).data ?? (response as unknown as Student);
};

/**
 * GET /api/students?search=X&pageSize=N
 * Simple student list — used for search functionality.
 */
export const getStudents = async (params?: {
  search?: string;
  pageSize?: number;
}): Promise<StudentBrief[]> => {
  const response = await axiosInstance.get<never, StudentBrief[]>(
    '/students',
    { params },
  );
  return response;
};

/**
 * GET /api/students/semesters
 * Response: { success, message, data: SemesterOption[] }
 */
export const getSemesters = async (): Promise<SemesterOption[]> => {
  const response = await axiosInstance.get<
    never,
    { success: boolean; data: SemesterOption[] }
  >('/students/semesters');
  return response.data;
};

/**
 * GET /api/students/semesters/:semester/sections
 * Response: { success, message, data: SectionOption[] }
 */
export const getSectionsBySemester = async (
  semester: number,
): Promise<SectionOption[]> => {
  const response = await axiosInstance.get<
    never,
    { success: boolean; data: SectionOption[] }
  >(`/students/semesters/${semester}/sections`);
  return response.data;
};

/**
 * GET /api/students/semesters/:semester/sections/:section
 *
 * Returns the full section dashboard which includes:
 *   - timetable: TimetableEntry[]  ← used by TimetableScreen
 *   - subjectFacultyMapping
 *   - students (paginated)
 *
 * Response: { success, message, data: SectionDashboard }
 *
 * The TimetableScreen calls this for each of the faculty's assigned
 * semester+section combinations and filters timetable rows where
 * facultyId matches the logged-in faculty's numeric faculty_id.
 */
export const getSectionDashboard = async (
  semester: number,
  section: string,
  params?: { page?: number; limit?: number },
): Promise<SectionDashboard> => {
  const response = await axiosInstance.get<
    never,
    { success: boolean; message: string; data: SectionDashboard }
  >(`/students/semesters/${semester}/sections/${section}`, { params });
  return response.data;
};

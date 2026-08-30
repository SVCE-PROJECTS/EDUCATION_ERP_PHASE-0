/**
 * Student types — derived from:
 *   prisma/schema.prisma  (Student model)
 *   unified_backend/src/controllers/studentController.js
 *     - getStudentsBySection   → { students: StudentBrief[] }
 *     - getStudentProfile      → StudentProfile (comprehensive)
 *     - getStudents            → StudentBrief[]
 *     - getById                → Student
 */

/**
 * Brief student record used by attendance/ia-marks screens.
 * Returned by GET /api/students/by-section/:semester/:section
 */
export interface StudentBrief {
  /** library_id — string PK, e.g. "LIB001" */
  student_id: string;
  usn: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  semester_number: number;
  section_name: string;
}

/**
 * Full student record returned by GET /api/students/:id
 */
export interface Student {
  library_id: string;
  usn: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string;
  program_id: number;
  department_id: number;
  semester_id: number;
  section_id: number;
  academic_year: string;
  status: 'Enrolled' | 'On Leave' | 'Transferred' | 'Inactive';
  created_at: string;
  updated_at: string;
  /** Joined fields */
  semester?: number;
  section?: string;
  program_name?: string;
  department_name?: string;
}

/**
 * Attendance summary row inside a student profile
 */
export interface StudentAttendanceSummary {
  subject: string;
  total: number;
  present: number;
  absent: number;
  percent: number;
}

/**
 * Single recent attendance record inside a student profile
 */
export interface RecentAttendance {
  subject: string;
  attendance_date: string;
  status: 'Present' | 'Absent';
}

/**
 * Comprehensive profile returned by GET /api/students/:id/profile
 */
export interface StudentProfile {
  student: Student;
  attendanceSummary: StudentAttendanceSummary[];
  overallAttendance: number;
  recentAttendance: RecentAttendance[];
  iaMarks: import('./iaMarks').IAMark[];
  assignments: import('./assignment').Assignment[];
  achievements: import('./achievement').Achievement[];
}

/**
 * Semester entry from GET /api/students/semesters
 * { success, data: [{ semester_id, semester_number }] }
 */
export interface SemesterOption {
  semester_id: number;
  semester_number: number;
}

/**
 * Section entry from GET /api/students/semesters/:semester/sections
 * { success, data: [{ section_id, section_name, ... }] }
 */
export interface SectionOption {
  section_id: number;
  section_name: string;
  semester_id: number;
  department_id: number;
}

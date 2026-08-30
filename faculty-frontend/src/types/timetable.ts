/**
 * Timetable types — derived from:
 *   unified_backend/src/repositories/timetableRepository.js
 *   unified_backend/src/services/studentList.service.js
 *   unified_backend/src/controllers/studentController.js → getSectionDashboard
 *
 * API endpoint:
 *   GET /api/students/semesters/:semester/sections/:section
 *   Response: { success, message, data: SectionDashboard }
 *
 * Timetable array shape (from studentList.service.js → getSectionDashboard):
 *   { day, period, subject, subjectCode, facultyId, faculty }
 *
 * day values: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' |
 *             'Friday' | 'Saturday' | 'Sunday'
 *
 * The faculty portal filters timetable rows to only show entries
 * where facultyId matches the logged-in faculty's numeric faculty_id.
 */

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

/**
 * One timetable slot — shaped by studentList.service.js
 */
export interface TimetableEntry {
  day: DayOfWeek;
  period: number;
  /** subject_name */
  subject: string;
  subjectCode: string;
  /** faculty.faculty_id (numeric) */
  facultyId: number | string;
  /** faculty.name */
  faculty: string;
}

/**
 * Subject → Faculty mapping row (also from section dashboard)
 */
export interface SubjectFacultyMapping {
  subject: string;
  subjectCode: string;
  faculty: string;
  facultyId: number | string;
}

/**
 * Full section dashboard response data
 * GET /api/students/semesters/:semester/sections/:section
 * response.data shape
 */
export interface SectionDashboard {
  semester: number;
  section: string;
  timetable: TimetableEntry[];
  subjectFacultyMapping: SubjectFacultyMapping[];
  students: {
    data: Array<{
      sno: number;
      usn: string | null;
      name: string;
      phone: string | null;
      email: string | null;
      attendance: number | null;
      performance: number | null;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

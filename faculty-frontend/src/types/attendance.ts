/**
 * Attendance types — derived from:
 *   prisma/schema.prisma  (Attendance model)
 *   unified_backend/src/controllers/attendanceController.js
 *
 * Table: attendance(attendance_id, student_id, class_id, attendance_date,
 *                   status CHECK('Present','Absent'), remarks, created_at)
 * UNIQUE (student_id, class_id, attendance_date)
 *
 * Subject is NOT a column — it is derived via class_id JOIN.
 */

export type AttendanceStatus = 'Present' | 'Absent';

/**
 * Row returned by GET /api/attendance?class_id=X&date=YYYY-MM-DD
 * Includes joined fields from students and subjects.
 */
export interface AttendanceRecord {
  attendance_id: number;
  student_id: string;       // library_id
  class_id: number;
  attendance_date: string;  // ISO date string 'YYYY-MM-DD'
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string;
  /** Joined from students */
  student_name: string;
  usn: string | null;
  /** Joined from subjects via classes */
  subject_name: string;
  subject_code: string;
}

/**
 * Body for POST /api/attendance  (single upsert)
 * student_id, class_id, attendance_date, status are required.
 */
export interface SaveAttendanceRequest {
  student_id: string;       // library_id
  class_id: number;
  attendance_date: string;  // 'YYYY-MM-DD'
  status: AttendanceStatus;
  remarks?: string;
}

/**
 * Body for POST /api/attendance/bulk
 */
export interface BulkAttendanceRequest {
  records: SaveAttendanceRequest[];
}

/**
 * Response from POST /api/attendance/bulk
 */
export interface BulkAttendanceResponse {
  message: string;
}

/**
 * Frontend helper: one student's attendance state in the marking UI
 */
export interface AttendanceEntry {
  student_id: string;
  name: string;
  usn: string | null;
  status: AttendanceStatus;
  remarks: string;
}

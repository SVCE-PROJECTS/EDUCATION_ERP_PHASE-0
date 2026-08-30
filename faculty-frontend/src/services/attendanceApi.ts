/**
 * Attendance API
 *
 * Backend: unified_backend/src/routes/attendanceRoutes.js
 *          unified_backend/src/controllers/attendanceController.js
 *
 * Endpoints:
 *   GET  /api/attendance?class_id=X&date=YYYY-MM-DD&student_id=Y
 *   POST /api/attendance        — single UPSERT
 *   POST /api/attendance/bulk   — array UPSERT (preferred for marking)
 *
 * All routes require Bearer token.
 * Attendance is keyed by UNIQUE(student_id, class_id, attendance_date) — the
 * backend uses ON CONFLICT DO UPDATE, so re-saving is safe.
 */

import axiosInstance from '../api/axiosInstance';
import type {
  AttendanceRecord,
  SaveAttendanceRequest,
  BulkAttendanceRequest,
  BulkAttendanceResponse,
} from '../types';

/**
 * GET /api/attendance
 * All params are optional — combine to narrow results.
 *
 * @param class_id    Filters to one class (subject+section combination)
 * @param date        ISO date string 'YYYY-MM-DD'
 * @param student_id  library_id string — get one student's history
 */
export const getAttendance = async (params: {
  class_id?: number;
  date?: string;
  student_id?: string;
}): Promise<AttendanceRecord[]> => {
  const response = await axiosInstance.get<never, AttendanceRecord[]>(
    '/attendance',
    { params },
  );
  return response;
};

/**
 * POST /api/attendance
 * Single attendance record UPSERT.
 * Required fields: student_id, class_id, attendance_date, status.
 */
export const saveAttendance = async (
  record: SaveAttendanceRequest,
): Promise<AttendanceRecord> => {
  const response = await axiosInstance.post<never, AttendanceRecord>(
    '/attendance',
    record,
  );
  return response;
};

/**
 * POST /api/attendance/bulk
 * Saves an array of attendance records in a single DB transaction.
 * Preferred method for marking a full class's attendance at once.
 *
 * Body: { records: SaveAttendanceRequest[] }
 */
export const saveAttendanceBulk = async (
  records: SaveAttendanceRequest[],
): Promise<BulkAttendanceResponse> => {
  const body: BulkAttendanceRequest = { records };
  const response = await axiosInstance.post<never, BulkAttendanceResponse>(
    '/attendance/bulk',
    body,
  );
  return response;
};

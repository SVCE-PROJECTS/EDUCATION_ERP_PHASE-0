/**
 * Faculty Portal — Academic Service
 * Matches the ACTUAL unified_backend schema:
 *   assignments: class_id, title, description, due_date, marks, status
 *   attendance:  student_id, class_id, attendance_date, status (Present/Absent)
 *   ia_marks:    student_id, class_id, ia1, ia2, ia3
 */

import api from './api';

// ── Classes (needed to populate dropdowns) ────────────────────────────────────
export interface ClassOption {
  class_id: number;
  subject_name: string;
  subject_code: string;
  section_name: string;
  semester_number: number;
}

// GET /api/faculty/:id  — we parse classes from the faculty's subjects
// The backend doesn't expose a direct /classes?faculty_id=X endpoint,
// so we fetch all classes filtered by faculty via assignments query approach.
// We'll store a hardcoded list after first fetch and cache in module scope.

// ── Assignment Service ────────────────────────────────────────────────────────
export interface AssignmentPayload {
  class_id: number;
  title: string;
  description?: string;
  due_date?: string;
  marks?: number;
  status?: string;
}

export const assignmentService = {
  getAll: async (params?: { class_id?: number; status?: string }) => {
    const res = await api.get('/assignments', { params });
    return res.data; // raw array
  },

  create: async (data: AssignmentPayload) => {
    const res = await api.post('/assignments', data);
    return res.data;
  },

  update: async (id: number, data: Partial<AssignmentPayload>) => {
    const res = await api.put(`/assignments/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await api.delete(`/assignments/${id}`);
    return res.data;
  },
};

// ── Attendance Service ────────────────────────────────────────────────────────
export interface AttendancePayload {
  student_id: string;   // VARCHAR(50) = students.library_id (USN string)
  class_id: number;
  attendance_date: string;
  status: 'Present' | 'Absent';
  remarks?: string;
}

export const attendanceService = {
  getAll: async (params?: { class_id?: number; date?: string; student_id?: string }) => {
    const res = await api.get('/attendance', { params });
    return res.data; // raw array
  },

  save: async (record: AttendancePayload) => {
    const res = await api.post('/attendance', record);
    return res.data;
  },

  saveBulk: async (records: AttendancePayload[]) => {
    const res = await api.post('/attendance/bulk', { records });
    return res.data;
  },
};

// ── IA Marks Service ──────────────────────────────────────────────────────────
export interface IAMarksPayload {
  student_id: string;   // VARCHAR(50) = students.library_id (USN string)
  class_id: number;
  ia1?: number;
  ia2?: number;
  ia3?: number;
}

export const iaMarksService = {
  getAll: async (params?: { student_id?: string; class_id?: number }) => {
    const res = await api.get('/ia-marks', { params });
    return res.data; // raw array
  },

  create: async (data: IAMarksPayload) => {
    const res = await api.post('/ia-marks', data);
    return res.data;
  },

  update: async (id: number, data: { ia1?: number; ia2?: number; ia3?: number }) => {
    const res = await api.put(`/ia-marks/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await api.delete(`/ia-marks/${id}`);
    return res.data;
  },
};

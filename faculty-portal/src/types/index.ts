/**
 * Faculty Portal — Shared TypeScript type definitions.
 * Mirrors the types used in hod-portal so both portals share the same
 * domain model. Keep this file self-contained.
 */

export interface Department {
  id: string;
  name: string;
  code: string;
}

export type FacultyStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface FacultyRole {
  id: string;
  facultyId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: string;
  role: Role;
}

export interface Faculty {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  qualification: string;
  experience: number;
  specialization?: string;
  /** Root-relative path from backend, resolve with resolveFileUrl() */
  photoUrl?: string | null;
  joiningDate: string;
  status: FacultyStatus;
  departmentId: string;
  username: string;
  department: Department;
  roles: FacultyRole[];
}

/** Decoded JWT payload stored in AuthContext */
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  departmentId?: string;
  departmentCode?: string;
  /** Array of role slugs e.g. ['FACULTY', 'TIMETABLE_COORDINATOR'] */
  roles: string[];
  isHOD: boolean;
  email?: string;
  photoUrl?: string | null;
  designation?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// ── Academic types ────────────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  semester: number;
  section?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subject: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  semester: number;
  section?: string;
}

export interface IAMark {
  id: string;
  studentId: string;
  subject: string;
  iaNumber: number;
  marksObtained: number;
  maxMarks: number;
  semester: number;
  section?: string;
}

export interface DashboardStats {
  totalStudents?: number;
  totalAssignments?: number;
  weeklyAttendanceRate?: number;
  pendingAssignments?: number;
}

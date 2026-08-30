/**
 * @fileoverview Shared TypeScript type definitions for the
 * Department Management Portal (React Native).
 */

export interface Department {
  id: string;
  name: string;
  code: string;
}

export type FacultyStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Role {
  id: string;
  /** Display name e.g. "Timetable Coordinator" */
  name: string;
  /** e.g. "TIMETABLE_COORDINATOR" */
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
  photo?: string;
  /** ISO date string */
  joiningDate: string;
  status: FacultyStatus;
  departmentId: string;
  username: string;
  department: Department;
  roles: FacultyRole[];
}

/** Decoded JWT payload stored in authStore */
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  departmentId: string;
  departmentCode: string;
  /** Array of role slugs */
  roles: string[];
  isHOD: boolean;
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

export interface AuditLog {
  id: string;
  performedBy: string;
  action: string;
  facultyId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

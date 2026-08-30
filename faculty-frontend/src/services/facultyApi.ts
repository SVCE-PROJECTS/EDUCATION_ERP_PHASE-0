/**
 * Faculty API
 *
 * Backend: unified_backend/src/routes/faculty.routes.js
 *          unified_backend/src/controllers/faculty.controller.js
 *
 * Endpoints used by Faculty Portal:
 *   GET /api/faculty/me          — own profile (no dept restriction)
 *   GET /api/faculty/me/classes  — classes assigned to logged-in faculty
 *   GET /api/faculty/:id         — another faculty by employee_id (dept-scoped)
 *   GET /api/faculty             — paginated list (dept-scoped, HOD only in practice)
 */

import axiosInstance from '../api/axiosInstance';
import type { FacultyProfile, FacultyClass, FacultyListResponse } from '../types';

interface SuccessWrap<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * GET /api/faculty/me
 * Returns the logged-in faculty's own profile — no HOD restriction.
 * Response: { success, message, data: FacultyProfile }
 */
export const getMyProfile = async (): Promise<FacultyProfile> => {
  const response = await axiosInstance.get<never, SuccessWrap<FacultyProfile>>(
    '/faculty/me',
  );
  return response.data;
};

/**
 * GET /api/faculty/me/classes
 * Returns all classes (subject + section + semester) assigned to the
 * logged-in faculty.  Used to populate dropdowns across all screens.
 * Response: { success, message, data: FacultyClass[] }
 */
export const getMyClasses = async (): Promise<FacultyClass[]> => {
  const response = await axiosInstance.get<never, SuccessWrap<FacultyClass[]>>(
    '/faculty/me/classes',
  );
  return response.data;
};

/**
 * GET /api/faculty/:id   (employee_id string, e.g. "EMP001")
 * Dept-scoped — the backend restricts to the requesting faculty's department.
 */
export const getFacultyById = async (
  employeeId: string,
): Promise<FacultyProfile> => {
  const response = await axiosInstance.get<never, SuccessWrap<FacultyProfile>>(
    `/faculty/${employeeId}`,
  );
  return response.data;
};

/**
 * GET /api/faculty?page=1&limit=20&search=...
 * Paginated dept-scoped list.
 */
export const getFacultyList = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<FacultyListResponse> => {
  const response = await axiosInstance.get<never, FacultyListResponse>(
    '/faculty',
    { params },
  );
  return response;
};

/**
 * Auth API — wraps POST /api/auth/faculty/login and related endpoints.
 *
 * Backend: unified_backend/src/controllers/authController.js
 *          unified_backend/src/services/authService.js
 *
 * Login response shape (from successResponse utility):
 *   { success: true, message: "Login successful", data: { token, faculty, isHOD } }
 */

import axiosInstance from '../api/axiosInstance';
import type { FacultyLoginRequest, FacultyProfile } from '../types/auth';

interface LoginResponseData {
  token: string;
  faculty: FacultyProfile;
  isHOD: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}

interface MeResponse {
  success: boolean;
  message: string;
  data: FacultyProfile;
}

/**
 * POST /api/auth/faculty/login
 * Faculty portal does NOT require departmentCode — only username + password.
 */
export const facultyLogin = async (
  credentials: FacultyLoginRequest,
): Promise<LoginResponseData> => {
  const response = await axiosInstance.post<never, LoginResponse>(
    '/auth/faculty/login',
    credentials,
  );
  return response.data;
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Requires Bearer token in header.
 */
export const getMe = async (): Promise<FacultyProfile> => {
  const response = await axiosInstance.get<never, MeResponse>('/auth/me');
  return response.data;
};

/**
 * POST /api/auth/logout
 * Clears the server-side HTTP-only cookie (if any).
 * Frontend must also clear AsyncStorage and in-memory token.
 */
export const logout = async (): Promise<void> => {
  await axiosInstance.post('/auth/logout');
};

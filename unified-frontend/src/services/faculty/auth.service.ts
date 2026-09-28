/**
 * Faculty Portal — Auth Service
 *
 * Calls the same unified_backend endpoints used by hod-portal.
 * Faculty login does NOT require departmentCode (unlike HOD login).
 * The backend's /api/auth/faculty/login endpoint handles faculty auth directly.
 */

import api from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export const authService = {
  /**
   * POST /api/auth/faculty/login
   * Uses the dedicated faculty login endpoint so departmentCode is not required.
   * Response shape: { success, data: { faculty, token, isHOD } }
   */
  login: async (credentials: LoginCredentials) => {
    const res = await api.post('/auth/faculty/login', credentials);
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

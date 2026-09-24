/**
 * Faculty Portal — Shared Axios instance.
 *
 * Mirrors hod-portal/src/services/api.ts exactly:
 *  - baseURL from EXPO_PUBLIC_API_URL (falls back to localhost:5000/api)
 *  - Request interceptor attaches JWT Bearer token
 *  - Response interceptor handles 401 → logout + redirect to Login
 *
 * Configuration:
 *   Set EXPO_PUBLIC_API_URL in your .env file (see .env.example).
 *   This is the ONLY place the backend URL needs to be set.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, logoutFromOutsideReact } from '../context/AuthContext';
import { resetToLogin } from '../navigation/navigationRef';
import Toast from './toast';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  timeout: 30_000,
  // withCredentials intentionally omitted — JWT via Authorization header only
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      logoutFromOutsideReact();
      resetToLogin();
      Toast.show({
        type: 'error',
        text1: 'Session expired',
        text2: 'Please log in again.',
      });
    }
    return Promise.reject(error);
  },
);

// Backend returns file paths as root-relative ('/uploads/documents/xxx.pdf')
// — resolve them against the API host (baseURL minus its trailing '/api')
// so they open correctly regardless of dev/prod host.
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const resolveFileUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;

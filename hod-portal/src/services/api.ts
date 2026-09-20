import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, logoutFromOutsideReact } from '../context/AuthContext';
import { resetToLogin } from '../navigation/navigationRef';
import Toast from './toast';

/**
 * Shared Axios instance.
 *
 * Changes from the web version:
 *  - baseURL reads EXPO_PUBLIC_API_URL (Expo env-var prefix), not REACT_APP_
 *  - withCredentials removed — RN does not persist cookies; auth is JWT-only
 *  - window.location.href replaced with resetToLogin() via the navigation ref
 *  - react-hot-toast replaced with a Paper Snackbar-based toast shim (services/toast.ts)
 *
 * baseURL:
 *  - Always prefer EXPO_PUBLIC_API_URL from .env (see .env.example) — this is
 *    the correct way to point at the unified_backend for your dev setup.
 *  - The fallback below assumes the unified_backend is running locally on its
 *    default PORT=5000 (see unified_backend/.env.example) and that the app is
 *    running in the Android emulator, where localhost maps to the host
 *    machine's localhost. iOS simulator / physical devices / web need a
 *    different host — set EXPO_PUBLIC_API_URL explicitly for those.
 */
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
  (error: AxiosError) => Promise.reject(error)
);

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stale session state
      logoutFromOutsideReact();
      // Navigate to login screen without needing a React hook
      resetToLogin();
      Toast.show({
        type: 'error',
        text1: 'Session expired',
        text2: 'Please log in again.',
      });
    }
    return Promise.reject(error);
  }
);

export default api;

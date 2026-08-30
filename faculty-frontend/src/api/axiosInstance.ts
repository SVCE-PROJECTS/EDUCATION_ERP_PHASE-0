import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config/api';
import { getToken } from './tokenStore';
import { callAuthErrorHandler } from './authErrorBus';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach Bearer token ──────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response: unwrap data + handle 401 cleanly ────────────────────────────────
axiosInstance.interceptors.response.use(
  // Success — unwrap axios response envelope
  (response: AxiosResponse) => response.data,

  // Error — normalise and handle 401
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'Something went wrong. Please try again.';
    const status = error.response?.status ?? 0;

    // On 401: trigger auth error handler (AuthContext clears session + navigates to Login)
    // Return a never-resolving promise so the originating screen doesn't also show an error.
    // Exception: the logout endpoint itself — let it resolve normally.
    if (status === 401) {
      const isLogoutCall = error.config?.url?.includes('/auth/logout');
      if (!isLogoutCall) {
        callAuthErrorHandler(message);
        return new Promise(() => {});
      }
    }

    return Promise.reject({ message, status });
  },
);

export default axiosInstance;

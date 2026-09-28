// @ts-nocheck
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { getToken, triggerLogout } from './tokenStore';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((requestConfig) => {
  const token = getToken();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or token invalid — force logout so AppNavigator
      // falls back to the Login screen, matching hod-portal/faculty-portal.
      triggerLogout();
    }
    const message = error.response?.data?.message
      || error.message
      || 'Something went wrong. Please try again.';
    const details = error.response?.data?.details || null;
    return Promise.reject({ message, details, status: error.response?.status });
  },
);

export default axiosInstance;

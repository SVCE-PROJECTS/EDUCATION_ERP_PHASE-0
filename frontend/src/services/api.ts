/**
 * api.ts — Central Axios instance for the Faculty Portal.
 *
 * URL strategy:
 *   Web browser  → always http://localhost:5001
 *                  (browser and backend are on the same machine)
 *   Mobile (Expo Go / device) → EXPO_PUBLIC_API_URL from .env
 *                  (run `node set-ip.js` from project root to update it)
 *
 * This means web always works without touching .env.
 * Mobile still needs set-ip.js when the network changes.
 */

import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, removeToken } from '../utils/tokenStorage';

const TOKEN_KEY = 'faculty_auth_token';

// Pick the right base URL per platform
function getBaseURL(): string {
  if (Platform.OS === 'web') {
    // Browser is on the same machine as the backend — localhost always works
    return 'http://localhost:5001';
  }
  // Mobile device — needs the LAN IP so the phone can reach the backend
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5001';
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach token ───────────────────────────
api.interceptors.request.use(async (config) => {
  if (!config.headers['Authorization']) {
    const token = await getToken(TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken(TOKEN_KEY);
      delete api.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

export default api;

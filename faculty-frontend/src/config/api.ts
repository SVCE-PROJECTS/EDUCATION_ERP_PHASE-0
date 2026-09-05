/**
 * Centralized API URL resolver — single source of truth.
 *
 * ── HOW IT WORKS ──────────────────────────────────────────────────────────────
 *
 * Priority order:
 *
 *  1. EXPO_PUBLIC_API_URL  — explicit override in .env (optional)
 *     Use this ONLY if automatic detection fails or you need a custom URL.
 *     Example: EXPO_PUBLIC_API_URL=http://192.168.1.5:5000/api
 *
 *  2. Expo manifest debuggerHost (automatic, works on physical devices)
 *     When you run `npx expo start`, Expo embeds the Metro server's host
 *     (your PC's current LAN IP) in the JS bundle via Constants.expoConfig.
 *     We extract that host and replace the port with the backend port.
 *     This means NO manual IP changes — it follows the Metro server IP
 *     automatically even as your network changes.
 *
 *  3. localhost fallback
 *     Used for:
 *       - Expo Web   (browser runs on the same machine as the backend)
 *       - Android emulator (10.0.2.2 alias → handled by Expo Go itself)
 *       - iOS simulator
 *
 * ── WHY localhost DOESN'T WORK ON PHYSICAL EXPO GO ───────────────────────────
 *
 * On a physical phone, "localhost" means the phone itself, not your PC.
 * That's why we read the Metro dev server host from Constants and use it
 * as the backend host — the backend and Metro server are on the same PC,
 * so they share the same LAN IP.
 *
 * ── BACKEND PORT ─────────────────────────────────────────────────────────────
 *
 * The backend runs on PORT defined in unified_backend/.env (default 5000).
 * Set EXPO_PUBLIC_API_PORT in faculty-frontend/.env to change it without
 * touching source code.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT: string =
  process.env.EXPO_PUBLIC_API_PORT ?? '5000';

/**
 * Resolve the backend API base URL.
 *
 * Returns a URL ending in /api, e.g. http://10.108.5.15:5000/api
 */
function resolveApiBaseUrl(): string {
  // 1. Explicit override always wins
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.trim() !== '') {
    return explicit.trim().replace(/\/$/, '');
  }

  // 2. Web platform — backend and browser are on the same machine
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}/api`;
  }

  // 3. Try to detect the Metro dev server host from Expo Constants.
  //    This is the PC's current LAN IP and changes automatically with
  //    the network — no manual ipconfig required.
  //
  //    Constants.expoConfig?.hostUri is set by Expo CLI when running
  //    in development mode and contains "<LAN-IP>:<metro-port>".
  //    We strip the metro port and use the host with the backend port.
  const hostUri: string | undefined =
    // Expo SDK 49+
    Constants.expoConfig?.hostUri ??
    // older SDK fallback
    (Constants as unknown as { manifest?: { debuggerHost?: string } })
      .manifest?.debuggerHost;

  if (hostUri) {
    // hostUri = "10.108.5.15:8081" → take just the host part
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${BACKEND_PORT}/api`;
    }
  }

  // 4. Final fallback — works for emulators and Expo Web
  return `http://localhost:${BACKEND_PORT}/api`;
}

export const API_BASE_URL: string = resolveApiBaseUrl();

/**
 * Same origin without /api — used to build full URLs for /uploads assets.
 */
export const API_ORIGIN: string = API_BASE_URL.replace(/\/api\/?$/, '');

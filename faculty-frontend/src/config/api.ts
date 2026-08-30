/**
 * Centralized API configuration — single source of truth for the backend URL.
 *
 * ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
 *
 * 1. Set EXPO_PUBLIC_API_URL in faculty-frontend/.env (gitignored).
 *    This is the ONLY place you ever need to change the URL.
 *
 * 2. If EXPO_PUBLIC_API_URL is not set, falls back to http://localhost:5000/api.
 *    This works for:
 *      - Android emulator  (localhost = host machine)
 *      - iOS simulator     (localhost = host machine)
 *      - Web browser       (localhost = same machine)
 *      - Expo Go on device (use EXPO_PUBLIC_API_URL with your LAN IP — see below)
 *
 * ─── SETUP (one-time) ─────────────────────────────────────────────────────────
 *
 * Copy faculty-frontend/.env.example → faculty-frontend/.env
 *
 * For emulator/simulator/web:        nothing to change, localhost works.
 * For Expo Go on a physical device:  set EXPO_PUBLIC_API_URL=http://<LAN-IP>:5000/api
 *   Find your LAN IP:  ipconfig  (Windows) / ifconfig  (Mac/Linux)
 *   Example:  EXPO_PUBLIC_API_URL=http://192.168.1.5:5000/api
 *
 * ─── WHY NOT HARDCODE THE IP ──────────────────────────────────────────────────
 *
 * LAN IPs change when you reconnect to WiFi. Keeping the URL in .env means
 * you edit ONE file (not source code) and the change is not committed to git.
 */

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

/**
 * Same origin without the /api suffix — used to build full URLs for
 * static assets served from /uploads (photos, documents).
 */
export const API_ORIGIN: string = API_BASE_URL.replace(/\/api\/?$/, '');

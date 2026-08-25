/**
 * tokenStorage.ts  — Web implementation
 *
 * Uses localStorage with a SSR-safe guard (Expo Router does static rendering
 * on web where `window` / `localStorage` are not available).
 *
 * Metro automatically picks tokenStorage.native.ts on iOS/Android.
 */

function storage(): Storage | null {
  // Guard: localStorage is undefined during SSR / static rendering
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export async function getToken(key: string): Promise<string | null> {
  return storage()?.getItem(key) ?? null;
}

export async function setToken(key: string, value: string): Promise<void> {
  storage()?.setItem(key, value);
}

export async function removeToken(key: string): Promise<void> {
  storage()?.removeItem(key);
}

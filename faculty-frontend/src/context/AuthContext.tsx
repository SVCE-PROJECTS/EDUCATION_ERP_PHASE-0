/**
 * AuthContext — Faculty Portal
 * Simple, robust session management.
 * No atob(). No blocking calls on startup. No circular deps.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { facultyLogin, logout as apiLogout } from '../services/authApi';
import { setToken, getToken } from '../api/tokenStore';
import { registerAuthErrorHandler, unregisterAuthErrorHandler } from '../api/authErrorBus';
import type { FacultyProfile } from '../types/auth';

const TOKEN_KEY   = 'faculty_auth_token';
const FACULTY_KEY = 'faculty_auth_user';

// ── Decode JWT payload using Buffer (available in React Native via Metro) ────
function jwtExpiry(token: string): number {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 0;
    // base64url → base64, pad
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '=='.substring(0, (4 - (b64.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(decoded) as { exp?: number };
    return obj.exp ?? 0;
  } catch {
    return 0;
  }
}

function isExpired(token: string): boolean {
  const exp = jwtExpiry(token);
  if (!exp) return false; // can't decode → assume valid, backend will reject if bad
  return exp < Math.floor(Date.now() / 1000) + 30;
}

// ── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  faculty: FacultyProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculty,        setFaculty]        = useState<FacultyProfile | null>(null);
  const [token,          setLocalToken]     = useState<string | null>(null);
  const [isReady,        setIsReady]        = useState(false);
  const [isLoggingIn,    setIsLoggingIn]    = useState(false);
  const [loginError,     setLoginError]     = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // ── Register 401 handler (no circular import — uses authErrorBus) ────────
  const handleAuthError = useCallback((message: string) => {
    const isTokenIssue =
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('invalid token') ||
      message.toLowerCase().includes('token missing') ||
      message.toLowerCase().includes('authentication');
    if (isTokenIssue) {
      // Clear local session — do NOT call apiLogout (would need token)
      AsyncStorage.multiRemove([TOKEN_KEY, FACULTY_KEY]).catch(() => null);
      setToken(null);
      setLocalToken(null);
      setFaculty(null);
      if (message.toLowerCase().includes('expired')) setSessionExpired(true);
    }
  }, []);

  useEffect(() => {
    registerAuthErrorHandler(handleAuthError);
    return () => { unregisterAuthErrorHandler(); };
  }, [handleAuthError]);

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedFaculty] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(FACULTY_KEY),
        ]);
        if (storedToken && storedFaculty) {
          if (isExpired(storedToken)) {
            // Clear silently — don't call backend, don't hang
            await AsyncStorage.multiRemove([TOKEN_KEY, FACULTY_KEY]);
            setSessionExpired(true);
          } else {
            setToken(storedToken);
            setLocalToken(storedToken);
            setFaculty(JSON.parse(storedFaculty) as FacultyProfile);
          }
        }
      } catch {
        await AsyncStorage.multiRemove([TOKEN_KEY, FACULTY_KEY]).catch(() => null);
      } finally {
        setIsReady(true); // ALWAYS fires — app never hangs on loading
      }
    })();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoginError(null);
    setSessionExpired(false);
    setIsLoggingIn(true);
    try {
      const { token: newToken, faculty: loggedInFaculty } =
        await facultyLogin({ username, password });
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(FACULTY_KEY, JSON.stringify(loggedInFaculty)),
      ]);
      setToken(newToken);
      setLocalToken(newToken);
      setFaculty(loggedInFaculty);
      return true;
    } catch (err: unknown) {
      setLoginError((err as { message?: string }).message ?? 'Login failed.');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Fire-and-forget backend logout (3s max), don't block UI
    if (getToken()) {
      Promise.race([
        apiLogout(),
        new Promise<void>(resolve => setTimeout(resolve, 3000)),
      ]).catch(() => null);
    }
    await AsyncStorage.multiRemove([TOKEN_KEY, FACULTY_KEY]);
    setToken(null);
    setLocalToken(null);
    setFaculty(null);
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    faculty,
    token,
    isAuthenticated: !!faculty && !!token,
    isReady,
    isLoggingIn,
    loginError,
    sessionExpired,
    login,
    logout,
  }), [faculty, token, isReady, isLoggingIn, loginError, sessionExpired, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

export default AuthContext;

/**
 * AuthContext.tsx
 *
 * Centralised authentication state for the Faculty Portal.
 *
 * Token storage uses tokenStorage.ts which picks:
 *   Native → expo-secure-store (encrypted)
 *   Web    → localStorage
 *
 * Provides: user, token, isAuthenticated, isLoading, login(), logout()
 */

import React, {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react';
import api from '../services/api';
import { getToken, setToken, removeToken } from '../utils/tokenStorage';

// ── Types ─────────────────────────────────────────────────────────

export interface FacultyUser {
  id:          number;
  name:        string;
  email:       string;
  role:        string;
  employee_id: string;
  department:  string;
  designation: string;
  phone?:      string;
  experience?: string;
}

interface AuthState {
  user:            FacultyUser | null;
  token:           string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
}

interface AuthContextValue extends AuthState {
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Constants ─────────────────────────────────────────────────────

const TOKEN_KEY = 'faculty_auth_token';

// ── Context ───────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:            null,
    token:           null,
    isAuthenticated: false,
    isLoading:       true,
  });

  // ── Restore session on app start ────────────────────────────────
  useEffect(() => {
    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreSession = async () => {
    try {
      const storedToken = await getToken(TOKEN_KEY);
      if (!storedToken) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

      const res = await api.get<{ user: FacultyUser }>('/auth/me');
      setState({
        user:            res.data.user,
        token:           storedToken,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch {
      // Token invalid or expired — clear it
      await removeToken(TOKEN_KEY);
      delete api.defaults.headers.common['Authorization'];
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  };

  // ── Login ────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: FacultyUser }>('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const { token, user } = res.data;

    await setToken(TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading:       false,
    });
  }, []);

  // ── Logout ───────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await removeToken(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;

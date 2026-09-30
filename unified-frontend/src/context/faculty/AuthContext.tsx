/**
 * Faculty Portal — AuthContext
 *
 * Mirrors the pattern used in hod-portal/src/context/AuthContext.tsx:
 *   - React Context + AsyncStorage (no zustand)
 *   - authRef object so api.ts interceptor can read token / trigger logout
 *     without consuming a React hook
 *   - Storage key is unique to this portal to prevent session bleed
 */

import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import { AuthUser } from '../../types';

const STORAGE_KEY = 'faculty-erp-auth-v1';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  hasRole: (slug: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mirror into a plain object so api.ts interceptor can read without hooks.
const authRef: { token: string | null; logout: () => void } = {
  token: null,
  logout: () => {},
};

export function getAuthToken(): string | null {
  return authRef.token;
}

export function logoutFromOutsideReact(): void {
  authRef.logout();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                 = useState<AuthUser | null>(null);
  const [token, setToken]               = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]       = useState(true);

  // Load persisted session OR auto-login from ?token= URL param (web only)
  useEffect(() => {
    (async () => {
      try {
        // ── Web: check for ?token= from unified-frontend ──────────────────
        if (Platform.OS === 'web') {
          const params = new URLSearchParams(window.location.search);
          const urlToken = params.get('token');
          if (urlToken) {
            window.history.replaceState({}, '', window.location.pathname);
            try {
              const res = await axios.get(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${urlToken}` },
              });
              const u = res.data?.data ?? res.data;
              const authUser: AuthUser = {
                id:             u.id,
                name:           u.name ?? u.fullName ?? u.username,
                username:       u.username,
                email:          u.email ?? '',
                designation:    u.designation ?? '',
                department:     u.department ?? { id: '', name: '', code: u.departmentCode ?? '' },
                departmentCode: u.departmentCode ?? u.department?.code ?? '',
                isHOD:          u.isHOD ?? u.is_hod ?? false,
                roles:          u.roles ?? [],
                profilePhoto:   u.profilePhoto ?? null,
              } as any;
              setUser(authUser);
              setToken(urlToken);
              setIsAuthenticated(true);
              return;
            } catch {
              // invalid token — fall through
            }
          }
        }
        // ── Restore persisted session ─────────────────────────────────────
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed.user ?? null);
          setToken(parsed.token ?? null);
          setIsAuthenticated(parsed.isAuthenticated ?? false);
        }
      } catch {
        // Corrupt storage — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, token, isAuthenticated }),
    ).catch(() => {});
  }, [user, token, isAuthenticated, isLoading]);

  const login = useCallback((userData: AuthUser, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback((userData: Partial<AuthUser>) => {
    setUser((current) => (current ? { ...current, ...userData } : (userData as AuthUser)));
  }, []);

  const hasRole = useCallback(
    (slug: string) => (user?.roles || []).includes(slug),
    [user],
  );

  // Keep the outside-React mirror current.
  authRef.token  = token;
  authRef.logout = logout;

  const value: AuthContextValue = {
    user, token, isAuthenticated, isLoading, login, logout, updateUser, hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

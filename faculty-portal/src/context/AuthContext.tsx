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
import { AuthUser } from '../types';

const STORAGE_KEY = 'faculty-erp-auth-v1';

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

  // Restore persisted session on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed.user ?? null);
          setToken(parsed.token ?? null);
          setIsAuthenticated(parsed.isAuthenticated ?? false);
        }
      } catch {
        // Corrupt storage — stay logged out.
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

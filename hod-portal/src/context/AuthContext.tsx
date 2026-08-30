import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types';

// Replaces the previous zustand-based authStore.ts (create + persist
// middleware) with plain React Context + AsyncStorage, to standardize
// state management with admin-frontend (which uses Context, not zustand).
const STORAGE_KEY = 'dept-erp-auth-v3'; // same key as before — existing sessions carry over

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true until the persisted session has been read once
  login: (userData: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  hasRole: (slug: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// React Context can only be read from inside a component via useContext().
// services/api.ts needs the current token and a logout() call from inside a
// plain axios interceptor (not a component), so AuthProvider mirrors the
// latest values into this plain object on every render. Non-React code
// should use getAuthToken()/logoutFromOutsideReact() below instead of
// trying to consume the Context directly.
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load whatever was persisted last time, once, on mount.
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
        // Corrupt/missing storage — fall back to logged-out state.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist on every change (mirrors zustand's persist middleware).
  useEffect(() => {
    if (isLoading) return; // don't overwrite storage with initial blank state before load completes
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, isAuthenticated })).catch(() => {});
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
  authRef.token = token;
  authRef.logout = logout;

  const value: AuthContextValue = {
    user, token, isAuthenticated, isLoading, login, logout, updateUser, hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

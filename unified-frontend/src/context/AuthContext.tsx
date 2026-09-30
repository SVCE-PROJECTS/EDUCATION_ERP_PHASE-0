// @ts-nocheck
/**
 * Unified AuthContext
 * Handles all 3 login flows:
 *  - admin:   POST /auth/login        { username, password }
 *  - hod:     POST /auth/faculty/login { departmentCode, username, password } -> isHOD=true
 *  - faculty: POST /auth/faculty/login { departmentCode, username, password } -> isHOD=false
 *
 * After login the role is stored alongside the user so the root navigator
 * knows which portal shell to render.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export type UserRole = 'admin' | 'hod' | 'faculty';

export interface UnifiedUser {
  id: string;
  username: string;
  name?: string;
  fullName?: string;
  role: UserRole;
  departmentCode?: string;
  isHOD?: boolean;
  // HOD/Faculty extra fields
  email?: string;
  designation?: string;
  department?: { id?: string; name?: string; code?: string };
  roles?: string[];
  profilePhoto?: string | null;
}

interface AuthContextValue {
  user: UnifiedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (user: UnifiedUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'unified_token';
const USER_KEY  = 'unified_user';
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

// Every storage key any portal may use. Unified logout wipes all of them.
const ALL_SESSION_KEYS = [
  TOKEN_KEY,
  USER_KEY,
  'auth_token',         // admin
  'auth_user',          // admin
  'dept-erp-auth-v3',   // hod (zustand persist)
];

const AuthContext = createContext<AuthContextValue | null>(null);

// Exposed so axios instances outside React can read the token
const _ref: { token: string | null } = { token: null };
export const getUnifiedToken = () => _ref.token;

// Lets code outside React (401 handlers, portal sign-out buttons) end the unified session:
//   unifiedLogoutRef.current?.()
export const unifiedLogoutRef: { current: null | (() => Promise<void>) } = { current: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<UnifiedUser | null>(null);
  const [token, setTok]     = useState<string | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (t && u) {
          _ref.token = t;
          setTok(t);
          setUser(JSON.parse(u));
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (authUser: UnifiedUser, authToken: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, authToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser));
    _ref.token = authToken;
    setTok(authToken);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(ALL_SESSION_KEYS);
    } finally {
      // Always clear in-memory state, even if storage removal throws
      _ref.token = null;
      setTok(null);
      setUser(null);
    }
  }, []);

  // Register so anything outside React can call it
  unifiedLogoutRef.current = logout;

  const value = useMemo(() => ({
    user, token, isAuthenticated: !!user, isReady, login, logout,
  }), [user, token, isReady, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// -- Login helpers (called from LoginScreen) ----------------------------------

// Recursively extracts a slug string from whatever shape the API returns:
// 'HOD' | { slug: 'HOD' } | { role: { slug: 'HOD', name: '...' } }
export function toRoleSlug(r: any): string | undefined {
  if (!r) return undefined;
  if (typeof r === 'string') return r;
  if (r.slug) return r.slug;
  if (r.role) return toRoleSlug(r.role);
  return r.name;
}

export async function doAdminLogin(username: string, password: string) {
  const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
  const raw = res.data?.data ?? res.data;
  const user: UnifiedUser = {
    id:       raw.user?.id ?? raw.id,
    username: raw.user?.username ?? username,
    fullName: raw.user?.fullName ?? raw.fullName,
    name:     raw.user?.fullName ?? raw.fullName ?? username,
    role:     'admin',
  };
  return { user, token: raw.token };
}

export async function doFacultyLogin(
  departmentCode: string,
  username: string,
  password: string,
  expectHOD: boolean,
) {
  const res = await axios.post(`${API_BASE}/auth/faculty/login`, {
    departmentCode, username, password,
  });
  const raw     = res.data?.data ?? res.data;
  const faculty = raw.faculty ?? raw.user ?? raw;
  const isHOD   = raw.isHOD ?? faculty?.is_hod ?? false;

  if (expectHOD && !isHOD) {
    throw new Error('Access denied. This account does not have HOD privileges.');
  }

  const user: UnifiedUser = {
    id:             faculty.id,
    username:       faculty.username ?? username,
    name:           faculty.name ?? faculty.fullName ?? username,
    fullName:       faculty.name ?? faculty.fullName,
    role:           isHOD ? 'hod' : 'faculty',
    departmentCode: faculty.department?.code ?? faculty.departmentCode ?? departmentCode,
    isHOD,
    email:          faculty.email ?? '',
    designation:    faculty.designation ?? '',
    department:     faculty.department ?? { code: departmentCode },
    roles:          (faculty.roles ?? []).map(toRoleSlug).filter(Boolean),
    profilePhoto:   faculty.profilePhoto ?? null,
  };
  return { user, token: raw.token };
}
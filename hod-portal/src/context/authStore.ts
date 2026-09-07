import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (userData: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  hasRole: (slug: string) => boolean;
}

/**
 * Authentication store.
 * Persisted via AsyncStorage (replaces web localStorage).
 * The storage key is bumped to v3 so stale web sessions are cleared.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (userData, token) => {
        set({ user: userData, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (userData) => {
        const current = get().user;
        set({ user: current ? { ...current, ...userData } : (userData as AuthUser) });
      },

      hasRole: (slug) => {
        const roles = get().user?.roles || [];
        return roles.includes(slug);
      },
    }),
    {
      name: 'dept-erp-auth-v3', // v3 — clears all stale web / v2 sessions
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

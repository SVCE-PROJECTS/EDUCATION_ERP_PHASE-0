import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeState {
  isDark: boolean;
  toggleDark: () => void;
  setDark: (value: boolean) => void;
}

/**
 * Persisted dark-mode preference — replaces HODLayout's localStorage logic.
 * Components read `isDark` and call `toggleDark()`.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggleDark: () => set({ isDark: !get().isDark }),
      setDark: (value) => set({ isDark: value }),
    }),
    {
      name: 'dept-erp-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

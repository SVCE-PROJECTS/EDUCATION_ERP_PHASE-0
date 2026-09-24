// @ts-nocheck
/**
 * Admin Portal — ThemeContext
 * Light/dark toggle, persisted to AsyncStorage. Unlike the shallow
 * "backdrop only" dark mode in faculty-portal/hod-portal, this exposes a
 * full `colors` palette (see theme/colors.ts) so every surface — sidebar,
 * cards, inputs, tables — actually switches, not just the page background.
 */
import React, {
  createContext, useContext, useEffect, useState, useCallback, useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/colors';

const STORAGE_KEY = 'admin-erp-theme-v1';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v === 'dark') setIsDark(true); })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    isDark,
    toggleTheme,
    colors: isDark ? darkColors : lightColors,
  }), [isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

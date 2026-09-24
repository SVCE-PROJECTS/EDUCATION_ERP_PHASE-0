import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';

// Replaces the previous zustand-based themeStore.ts with plain React
// Context + AsyncStorage. No non-React consumers exist for theme state
// (unlike auth), so this one needs no outside-React mirror.
const STORAGE_KEY = 'dept-erp-theme'; // same key as before — existing preference carries over

export interface ThemeContextValue {
  isDark: boolean;
  toggleDark: () => void;
  setDark: (value: boolean) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setIsDark(Boolean(JSON.parse(raw).isDark));
      } catch {
        // Corrupt/missing storage — fall back to light mode.
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ isDark })).catch(() => {});
  }, [isDark]);

  const toggleDark = useCallback(() => setIsDark((d) => !d), []);
  const setDark = useCallback((value: boolean) => setIsDark(value), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, toggleDark, setDark, colors: isDark ? darkColors : lightColors }),
    [isDark, toggleDark, setDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a <ThemeProvider>');
  return ctx;
}

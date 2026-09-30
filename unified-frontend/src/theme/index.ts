// @ts-nocheck
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import colors, { lightColors, darkColors } from './colors';
import typography from './typography';
import { spacing, radius } from './spacing';
import shadows from './shadows';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    secondary: lightColors.secondary,
    background: lightColors.background,
    surface: lightColors.surface,
    onSurface: lightColors.textPrimary,
    onSurfaceVariant: lightColors.textSecondary,
    error: lightColors.danger,
    outline: lightColors.border,
  },
  roundness: radius.md,
};

// react-native-paper's own chrome (Dialog, Modal, Snackbar, Menu) reads the
// PaperProvider theme directly — it doesn't know about our ThemeContext. So
// dark mode needs a matching MD3 dark theme, picked at the App root based on
// isDark, or every Dialog/Snackbar in the app would stay light regardless of
// the toggle.
export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    secondary: darkColors.secondary,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceAlt,
    onSurface: darkColors.textPrimary,
    onSurfaceVariant: darkColors.textSecondary,
    error: darkColors.danger,
    outline: darkColors.border,
  },
  roundness: radius.md,
};

export const theme = {
  colors, typography, spacing, radius, shadows,
};

export {
  colors, typography, spacing, radius, shadows,
};

export default theme;

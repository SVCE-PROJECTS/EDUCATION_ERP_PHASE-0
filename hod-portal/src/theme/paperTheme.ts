import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { colors, neutral, primaryScale } from './colors';

/**
 * Extend RN Paper's MD3 themes with the app's primary blue palette.
 */
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: primaryScale[400],
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: neutral[100],
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.danger,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: primaryScale[400],
    primaryContainer: colors.primaryDark,
    secondary: primaryScale[300],
    background: neutral[950],
    surface: neutral[800],
    surfaceVariant: neutral[700],
    onSurface: neutral[50],
    onSurfaceVariant: neutral[400],
    outline: neutral[700],
    error: colors.red[400],
  },
};

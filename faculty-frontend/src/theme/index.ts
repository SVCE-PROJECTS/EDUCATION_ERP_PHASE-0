import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    error: colors.danger,
    outline: colors.border,
  },
  roundness: radius.md,
};

export const theme = { colors, typography, spacing, radius };

export { colors, typography, spacing, radius };
export default theme;

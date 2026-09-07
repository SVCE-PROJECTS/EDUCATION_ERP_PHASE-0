export * from './colors';
export * from './spacing';
export * from './paperTheme';

/**
 * DESIGN_TOKENS — single import point for all design primitives.
 *
 * Usage:
 *   import { DESIGN_TOKENS } from '../theme';
 *   const { colors, spacing, radii, fontSizes, fontWeights, shadows, layout } = DESIGN_TOKENS;
 */
import { colors, neutral, primaryScale, shadows, roleBadgeColors, statusColors, avatarColors } from './colors';
import { spacing, radii, fontSizes, fontWeights, layout } from './spacing';

export const DESIGN_TOKENS = {
  colors,
  neutral,
  primaryScale,
  shadows,
  roleBadgeColors,
  statusColors,
  avatarColors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  layout,
};

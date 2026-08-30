/**
 * Faculty Portal colour palette.
 * Teal/green primary to visually distinguish from the Admin portal (blue).
 */
const colors = {
  primary: '#0D9488',       // teal-600
  primaryDark: '#0F766E',   // teal-700
  primaryLight: '#CCFBF1',  // teal-100

  background: '#F8FAFC',
  surface: '#FFFFFF',

  border: '#E2E8F0',
  borderFocus: '#0D9488',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  placeholder: '#94A3B8',

  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#0284C7',
  infoBg: '#E0F2FE',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export default colors;
export { colors };

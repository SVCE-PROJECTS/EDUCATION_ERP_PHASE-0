/**
 * Central color tokens — mirrors the app's design theme.
 * Every component imports from here instead of hard-coding hex strings.
 *
 * `colors` below is the primary design-theme palette (flat tokens).
 * `neutral` and `primaryScale` are supplementary tonal scales derived from
 * the same theme (slate / blue) used where an intermediate shade is needed
 * (hover states, dividers, subtle backgrounds) that the flat token set
 * doesn't cover on its own.
 */

export const colors = {
  primary: '#2563EB', // main blue (buttons, links, active nav)
  primaryDark: '#1E3A8A',
  primaryLight: '#DBEAFE',
  primarySoft: '#EFF6FF',

  secondary: '#7C3AED', // violet accent — pairs with primary for the brand gradient
  secondaryLight: '#EDE9FE',

  background: '#F3F5FA', // page background
  surface: '#FFFFFF', // cards, inputs, sidebar

  border: '#E2E8F0',
  borderFocus: '#2563EB',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  placeholder: '#94A3B8',

  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#CA8A04',
  warningBg: '#FEF9C3',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(15, 23, 42, 0.5)',

  // Blue → violet gradient used for the drawer brand panel, login screen and
  // dashboard greeting header — the same identity admin-frontend uses.
  gradientPrimary: ['#1D4ED8', '#7C3AED'] as [string, string],

  // ── Extended accent palette ────────────────────────────────────────────────
  // Kept for role-badge / avatar variety and other multi-hue UI that the flat
  // theme spec above doesn't define. Values already align with the theme's
  // success/warning/danger tones at their 600/100 stops.
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    800: '#166534',
    900: '#14532d',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    900: '#7f1d1d',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    500: '#eab308',
    600: '#ca8a04',
    800: '#854d0e',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    300: '#fcd34d',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    900: '#78350f',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    500: '#f97316',
    600: '#ea580c',
    800: '#9a3412',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    300: '#93c5fd',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    800: '#6b21a8',
    900: '#581c87',
  },
  violet: {
    500: '#8b5cf6',
    600: '#7c3aed',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    300: '#f9a8d4',
    500: '#ec4899',
    600: '#db2777',
    800: '#9d174d',
    900: '#831843',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    500: '#06b6d4',
    600: '#0891b2',
    800: '#155e75',
  },
  teal: {
    500: '#14b8a6',
    600: '#0d9488',
  },
  emerald: {
    500: '#10b981',
    600: '#059669',
  },
  rose: {
    500: '#f43f5e',
    600: '#e11d48',
  },
} as const;

// ── Supplementary neutral (slate) scale ───────────────────────────────────────
// Anchored to the theme: 50 = background, 200 = border, 400 = textMuted,
// 500 = textSecondary, 900 = textPrimary.
export const neutral = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#020617',
} as const;

// ── Supplementary primary (blue) scale ────────────────────────────────────────
// Anchored to the theme: 100 = primaryLight, 700 = primary, 900 = primaryDark.
export const primaryScale = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
} as const;

export type ColorScale = Record<number, string>;

// ── Role badge colors ─────────────────────────────────────────────────────────
export const roleBadgeColors = {
  HOD: {
    bg: colors.purple[100],
    text: colors.purple[800],
  },
  FACULTY: {
    bg: colors.blue[100],
    text: colors.blue[800],
  },
  TIMETABLE_COORDINATOR: {
    bg: colors.green[100],
    text: colors.green[800],
  },
  EXAM_COORDINATOR: {
    bg: colors.orange[100],
    text: colors.orange[800],
  },
  CULTURAL_COORDINATOR: {
    bg: colors.pink[100],
    text: colors.pink[800],
  },
  PLACEMENT_COORDINATOR: {
    bg: colors.cyan[100],
    text: colors.cyan[800],
  },
  DEFAULT: {
    bg: neutral[100],
    text: neutral[800],
  },
} as const;

// ── Avatar background colors (replaces Tailwind bg-* class strings) ───────────
export const avatarColors: string[] = [
  colors.violet[500],
  colors.blue[500],
  colors.emerald[500],
  colors.orange[500],
  colors.pink[500],
  colors.cyan[500],
  colors.rose[500],
  colors.teal[500],
];

// ── Status badge colors ───────────────────────────────────────────────────────
export const statusColors = {
  ACTIVE: {
    bg: colors.successBg,
    text: colors.success,
    dot: colors.success,
  },
  INACTIVE: {
    bg: colors.dangerBg,
    text: colors.danger,
    dot: colors.danger,
  },
  ON_LEAVE: {
    bg: colors.warningBg,
    text: colors.warning,
    dot: colors.warning,
  },
} as const;

// ── Shadow / elevation presets ────────────────────────────────────────────────
export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  soft: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  glow: {
    shadowColor: primaryScale[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
} as const;

// ── Dark theme ─────────────────────────────────────────────────────────────────
// A parallel semantic palette for page chrome (backgrounds/surfaces/borders/
// text) — NOT a re-derivation of the neutral/primaryScale numeric scales,
// which are used throughout the app with hardcoded lightness assumptions
// (e.g. neutral[900] always means "darkest text") and would be unsafe to
// invert wholesale. Components that want real dark-mode support read this
// via useTheme().colors instead of importing `colors` statically; badge/
// accent colors (roleBadgeColors, avatarColors, the extended hue scales)
// deliberately stay the same in both themes, same as small colored chips
// commonly do in most design systems.
export type ThemeColors = {
  [K in keyof typeof colors]: (typeof colors)[K] extends string ? string : (typeof colors)[K];
};

export const darkColors: ThemeColors = {
  ...colors,
  primary: '#3B82F6',
  primaryDark: '#60A5FA',
  primaryLight: '#1E3A5F',
  primarySoft: '#15233A',

  secondary: '#A78BFA',
  secondaryLight: '#2E2350',

  background: '#0B1220',
  surface: '#131B2C',

  border: '#26324A',
  borderFocus: '#3B82F6',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  placeholder: '#64748B',

  successBg: '#123321',
  warningBg: '#3A2A0A',
  dangerBg: '#3A1414',

  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const lightColors: ThemeColors = colors;

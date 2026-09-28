// @ts-nocheck
export const lightColors = {
  primary: '#2563EB', // main blue (buttons, links, active nav)
  primaryDark: '#1E3A8A',
  primaryLight: '#DBEAFE',
  primarySoft: '#EFF6FF',

  secondary: '#7C3AED', // violet accent used for gradients + highlights
  secondaryLight: '#EDE9FE',

  background: '#F3F5FA', // page background
  surface: '#FFFFFF', // cards, inputs, sidebar
  surfaceAlt: '#F8FAFC',

  border: '#E7EBF3',
  borderFocus: '#2563EB',

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

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.5)',

  // Gradient stops used for the sidebar header, login panel and other
  // "hero" surfaces that want a premium, catchy accent. Same in both themes.
  gradientPrimary: ['#1D4ED8', '#7C3AED'],

  // Semantic tint/icon/border triples for color-coded chips (dashboard
  // stat cards, nav icon badges, etc).
  accent: {
    blue:   { bg: '#EFF6FF', icon: '#2563EB', border: '#DBEAFE' },
    violet: { bg: '#F5F3FF', icon: '#7C3AED', border: '#EDE9FE' },
    teal:   { bg: '#F0FDFA', icon: '#0D9488', border: '#CCFBF1' },
    amber:  { bg: '#FFFBEB', icon: '#D97706', border: '#FDE9C7' },
    rose:   { bg: '#FFF1F2', icon: '#E11D48', border: '#FFE1E4' },
  },
};

// Real dark theme — every surface gets a dark equivalent, not just the page
// backdrop. Same key set as lightColors so any component that reads
// `colors.xxx` works unchanged once it's wired to pull `colors` from
// useTheme() instead of the static import.
export const darkColors = {
  primary: '#3B82F6',
  primaryDark: '#60A5FA',
  primaryLight: '#1E3A5F',
  primarySoft: '#15233A',

  secondary: '#A78BFA',
  secondaryLight: '#2E2350',

  background: '#0B1220',
  surface: '#131B2C',
  surfaceAlt: '#1A2436',

  border: '#26324A',
  borderFocus: '#3B82F6',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  placeholder: '#64748B',

  success: '#4ADE80',
  successBg: '#123321',
  warning: '#FBBF24',
  warningBg: '#3A2A0A',
  danger: '#F87171',
  dangerBg: '#3A1414',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',

  gradientPrimary: ['#1D4ED8', '#7C3AED'],

  accent: {
    blue:   { bg: '#15233A', icon: '#60A5FA', border: '#1E3A5F' },
    violet: { bg: '#241A3D', icon: '#A78BFA', border: '#372755' },
    teal:   { bg: '#0F2C29', icon: '#2DD4BF', border: '#134E48' },
    amber:  { bg: '#3A2A0A', icon: '#FBBF24', border: '#4D3A12' },
    rose:   { bg: '#3A1420', icon: '#FB7185', border: '#4D1B2B' },
  },
};

// Default export stays the light palette — any file still using the old
// `import { colors } from '../theme'` static import keeps working exactly
// as before (just not theme-reactive). Files wired to useTheme() get
// whichever palette matches the current mode.
export const colors = lightColors;

export default colors;

// Role badge colors for faculty/HOD badges
export const roleBadgeColors = {
  HOD:                   { bg: '#F3E8FF', text: '#6B21A8' },
  FACULTY:               { bg: '#DBEAFE', text: '#1E3A8A' },
  TIMETABLE_COORDINATOR: { bg: '#D1FAE5', text: '#065F46' },
  EXAM_COORDINATOR:      { bg: '#FFEDD5', text: '#9A3412' },
  CULTURAL_COORDINATOR:  { bg: '#FCE7F3', text: '#9F1239' },
  PLACEMENT_COORDINATOR: { bg: '#CFFAFE', text: '#164E63' },
  DEFAULT:               { bg: '#F5F5F5', text: '#404040' },
} as const;

// Status colors for faculty/staff status
export const statusColors = {
  ACTIVE:   { bg: '#D1FAE5', text: '#059669', dot: '#059669' },
  INACTIVE: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
  ON_LEAVE: { bg: '#FEF3C7', text: '#D97706', dot: '#D97706' },
} as const;

// Avatar colors array
export const avatarColors: string[] = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EC4899', '#06B6D4', '#F43F5E', '#14B8A6',
];

// Primary blue scale (used by faculty/HOD portals)
export const primaryScale = {
  50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
  400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
  800: '#1E40AF', 900: '#1E3A8A', 950: '#172554',
} as const;

// Neutral gray scale
export const neutral = {
  50: '#FAFAFA', 100: '#F5F5F5', 200: '#E5E5E5', 300: '#D4D4D4',
  400: '#A3A3A3', 500: '#737373', 600: '#525252', 700: '#404040',
  800: '#262626', 900: '#171717', 950: '#0A0A0A',
} as const;

// ThemeColors type for dark theme support
export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  secondary: string;
  secondaryLight: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
};

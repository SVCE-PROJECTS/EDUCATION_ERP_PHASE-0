/**
 * Centralised screen name constants.
 * Import these instead of using raw strings — prevents typo bugs.
 */
export const ROUTES = {
  // ── Auth ────────────────────────────────────────────────────────────────
  LOGIN: 'Login',

  // ── HOD Drawer screens ───────────────────────────────────────────────────
  HOD_DASHBOARD: 'HODDashboard',
  HOD_FACULTY: 'FacultyManagement',
  HOD_STUDENTS: 'StudentManagement',
  HOD_COORDINATORS: 'CoordinatorManagement',
  HOD_ACTIVITIES: 'Activities',

  // ── HOD Stack screens (pushed on top of drawer) ──────────────────────────
  FACULTY_PROFILE: 'FacultyProfile',
  FACULTY_ADD: 'FacultyAdd',
  FACULTY_EDIT: 'FacultyEdit',

  // ── Fallback ─────────────────────────────────────────────────────────────
  NOT_FOUND: 'NotFound',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Human-readable title for each screen — used by the header.
 */
export const SCREEN_TITLES: Record<string, string> = {
  [ROUTES.HOD_DASHBOARD]: 'Dashboard',
  [ROUTES.HOD_FACULTY]: 'Faculty Management',
  [ROUTES.HOD_STUDENTS]: 'Student Management',
  [ROUTES.HOD_COORDINATORS]: 'Coordinator Management',
  [ROUTES.HOD_ACTIVITIES]: 'Student Activities',
  [ROUTES.FACULTY_PROFILE]: 'Faculty Profile',
  [ROUTES.FACULTY_ADD]: 'Add Faculty',
  [ROUTES.FACULTY_EDIT]: 'Edit Faculty',
};

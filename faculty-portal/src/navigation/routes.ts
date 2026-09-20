/**
 * Faculty Portal — Route name constants.
 * All screen names live here so they can be imported rather than hard-coded.
 */

export const ROUTES = {
  // Auth
  LOGIN: 'Login',

  // Drawer screens
  FACULTY_DASHBOARD: 'FacultyDashboard',
  MY_PROFILE:        'MyProfile',
  ASSIGNMENTS:       'Assignments',
  ATTENDANCE:        'Attendance',
  IA_MARKS:          'IAMarks',

  // Stack-push screens
  ASSIGNMENT_DETAIL: 'AssignmentDetail',
  ADD_ASSIGNMENT:    'AddAssignment',
  EDIT_ASSIGNMENT:   'EditAssignment',
  MARK_ATTENDANCE:   'MarkAttendance',
  ADD_IA_MARKS:      'AddIAMarks',

  // Fallback
  NOT_FOUND: 'NotFound',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

/** Human-readable title for each screen — used by Topbar. */
export const SCREEN_TITLES: Record<string, string> = {
  [ROUTES.FACULTY_DASHBOARD]: 'Dashboard',
  [ROUTES.MY_PROFILE]:        'My Profile',
  [ROUTES.ASSIGNMENTS]:       'Assignments',
  [ROUTES.ATTENDANCE]:        'Attendance',
  [ROUTES.IA_MARKS]:          'IA Marks',
  [ROUTES.ASSIGNMENT_DETAIL]: 'Assignment Details',
  [ROUTES.ADD_ASSIGNMENT]:    'New Assignment',
  [ROUTES.EDIT_ASSIGNMENT]:   'Edit Assignment',
  [ROUTES.MARK_ATTENDANCE]:   'Mark Attendance',
  [ROUTES.ADD_IA_MARKS]:      'Add IA Marks',
};

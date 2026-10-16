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
  MY_SCHEDULES:      'MySchedules',
  MEETINGS:          'Meetings',
  MEETING_DETAILS:   'FacultyMeetingDetails',
  CREATE_MEETING:    'FacultyCreateMeeting',
  EDIT_MEETING:      'FacultyEditMeeting',
  ACTIVITY_LOG:      'ActivityLog',
  ANALYTICS:         'FacultyAnalytics',

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
  [ROUTES.MY_SCHEDULES]:      'My Schedules',
  [ROUTES.MEETINGS]:          'Meetings',
  [ROUTES.MEETING_DETAILS]:   'Meeting Details',
  [ROUTES.CREATE_MEETING]:    'Create Meeting',
  [ROUTES.EDIT_MEETING]:      'Edit Meeting',
  [ROUTES.ACTIVITY_LOG]:      'Activity Log',
  [ROUTES.ANALYTICS]:         'Analytics',
  [ROUTES.ASSIGNMENT_DETAIL]: 'Assignment Details',
  [ROUTES.ADD_ASSIGNMENT]:    'New Assignment',
  [ROUTES.EDIT_ASSIGNMENT]:   'Edit Assignment',
  [ROUTES.MARK_ATTENDANCE]:   'Mark Attendance',
  [ROUTES.ADD_IA_MARKS]:      'Add IA Marks',
};

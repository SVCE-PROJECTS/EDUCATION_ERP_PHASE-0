// @ts-nocheck
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

// Same host as API_BASE_URL but without the /api suffix - used to build full
// URLs for files served statically (e.g. /uploads/...), like transfer documents.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: n,
  name: `Semester ${n}`,
}));

export const GENDERS = [
  { id: 'Male', name: 'Male' },
  { id: 'Female', name: 'Female' },
];

export const STUDENT_STATUS = {
  ENROLLED: 'Enrolled',
  ON_LEAVE: 'On Leave',
  TRANSFERRED: 'Transferred',
  INACTIVE: 'Inactive',
};

export const STATUS_COLOR_KEY = {
  [STUDENT_STATUS.ENROLLED]: 'success',
  [STUDENT_STATUS.ON_LEAVE]: 'warning',
  [STUDENT_STATUS.TRANSFERRED]: 'muted',
  [STUDENT_STATUS.INACTIVE]: 'danger',
};

export const PAGE_SIZE = 20;

// Fixed, shared venue list for offline meetings across all 3 portals.
// Temporary placeholder set until the college provides a real room directory.
export const OFFLINE_MEETING_VENUES = [
  'Project Room 1',
  'Meeting Room 2',
  'Project Room 3',
  'Project Room 4',
];

export const EXPORT_FORMATS = {
  EXCEL: 'excel',
  PDF: 'pdf',
};

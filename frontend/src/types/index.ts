/**
 * Shared TypeScript types for the Faculty Portal.
 * Import from here — do not redefine these in individual components.
 */

// ── Faculty / Auth ─────────────────────────────────────────────────

export interface FacultyUser {
  id:          number;
  name:        string;
  email:       string;
  role:        string;
  employee_id: string;
  department:  string;
  designation: string;
  phone?:      string;
  experience?: string;
}

// ── Students ───────────────────────────────────────────────────────

export interface Student {
  id:         number;
  usn:        string;
  name:       string;
  email?:     string;
  phone?:     string;
  semester:   number | string;
  section:    string;
  status:     string;
  counsellor?: string;
  created_at?: string;
}

// ── Attendance ─────────────────────────────────────────────────────

export type AttendanceStatus = 'Present' | 'Absent';

export interface StudentAttendance {
  id:     number;   // student_id
  usn:    string;
  name:   string;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  student_id:      number;
  subject:         string;
  attendance_date: string;
  status:          AttendanceStatus;
}

// ── IA Marks ───────────────────────────────────────────────────────

export interface IARecord {
  id:       number;
  usn:      string;
  name:     string;
  subject?: string;
  ia1:      number;
  ia2:      number;
  ia3:      number;
}

// ── Assignments ────────────────────────────────────────────────────

export interface Assignment {
  id:        number;
  title:     string;
  subject:   string;
  semester:  string | number;
  dueDate:   string;
  due_date?: string;
  marks:     number | string;  // DB returns number, some legacy code uses string
  status:    'Open' | 'Closed' | 'Graded';
}

// ── Dashboard ──────────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents:     number;
  attendancePercent: number;
  totalAssignments:  number;
  openAssignments:   number;
  iaAverage:         number;
  recentActivities?: string[];
}

export interface WeeklyAttendanceDay {
  date:    string;
  day:     string;
  percent: number;
  present: number;
  total:   number;
}

// ── API responses ──────────────────────────────────────────────────

export interface ApiError {
  message: string;
}

// ── Achievements ───────────────────────────────────────────────────

export type AchCategory =
  | 'Certification'
  | 'Hackathon'
  | 'Event'
  | 'Competition'
  | 'Publication'
  | 'Award'
  | 'Other';

export interface Achievement {
  id:             number;
  student_id:     number | string;
  usn:            string;
  category:       AchCategory;
  title:          string;
  issuer?:        string;
  date_achieved?: string;
  description?:   string;
}

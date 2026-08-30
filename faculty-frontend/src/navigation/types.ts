/**
 * Navigation type definitions.
 * All screens in the Faculty Portal stack.
 */

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Attendance: undefined;
  IAMarks: undefined;
  Assignments: undefined;
  AssignmentDetail: { assignmentId: number };
  Students: undefined;
  StudentProfile: { studentId: string; studentName?: string };
  AIChecker: undefined;
  Timetable: undefined;
  Profile: undefined;
};

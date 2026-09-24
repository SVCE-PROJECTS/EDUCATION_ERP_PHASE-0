import { roleBadgeColors } from '../theme/colors';

export const ROLE_SLUGS = {
  HOD:                   'HOD',
  FACULTY:               'FACULTY',
  TIMETABLE_COORDINATOR: 'TIMETABLE_COORDINATOR',
  EXAM_COORDINATOR:      'EXAM_COORDINATOR',
  CULTURAL_COORDINATOR:  'CULTURAL_COORDINATOR',
  PLACEMENT_COORDINATOR: 'PLACEMENT_COORDINATOR',
} as const;

export const getRoleBadgeColors = (slug: string) =>
  (roleBadgeColors as Record<string, { bg: string; text: string }>)[slug] ?? roleBadgeColors.DEFAULT;

export const getRoleShortName = (slug: string): string => {
  const map: Record<string, string> = {
    HOD:                   'HOD',
    FACULTY:               'Faculty',
    TIMETABLE_COORDINATOR: 'TT Coordinator',
    EXAM_COORDINATOR:      'Exam Coordinator',
    CULTURAL_COORDINATOR:  'Cultural Coordinator',
    PLACEMENT_COORDINATOR: 'Placement Coordinator',
  };
  return map[slug] || slug;
};

export const ROLE_RESPONSIBILITIES: Record<string, string[]> = {
  HOD: [
    'Oversee overall department operations and academic quality',
    'Approve faculty and student academic decisions',
    'Coordinate with college administration',
  ],
  FACULTY: [
    'Teach assigned courses and conduct evaluations',
    'Mark attendance and maintain student records',
    'Mentor and guide students',
  ],
  TIMETABLE_COORDINATOR: [
    'Prepare and maintain the department timetable',
    'Resolve scheduling conflicts between faculty and rooms',
    'Communicate timetable changes to faculty and students',
  ],
  EXAM_COORDINATOR: [
    'Plan and schedule internal assessments and exams',
    'Coordinate invigilation duties among faculty',
    'Compile and submit exam results',
  ],
  CULTURAL_COORDINATOR: [
    'Plan and organize department cultural events',
    'Coordinate student participation in cultural activities',
    'Manage event budgets and logistics',
  ],
  PLACEMENT_COORDINATOR: [
    'Liaise with companies for placement drives',
    'Prepare students for interviews and assessments',
    'Maintain placement records and statistics',
  ],
};

/**
 * Responsibility bullets for a role slug. Falls back to a generic line for
 * any role not in the map so newly added roles don't render an empty list.
 */
export const getRoleResponsibilities = (slug: string): string[] =>
  ROLE_RESPONSIBILITIES[slug] ?? ['Responsibilities for this role will be shared by your department.'];

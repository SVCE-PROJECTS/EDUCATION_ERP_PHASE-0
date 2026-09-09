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

import { roleBadgeColors } from '../theme/colors';
import { Role } from '../types';

export const ROLE_SLUGS = {
  HOD: 'HOD',
  FACULTY: 'FACULTY',
  TIMETABLE_COORDINATOR: 'TIMETABLE_COORDINATOR',
  EXAM_COORDINATOR: 'EXAM_COORDINATOR',
  CULTURAL_COORDINATOR: 'CULTURAL_COORDINATOR',
  PLACEMENT_COORDINATOR: 'PLACEMENT_COORDINATOR',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const COORDINATOR_ROLES: RoleSlug[] = [
  ROLE_SLUGS.TIMETABLE_COORDINATOR,
  ROLE_SLUGS.EXAM_COORDINATOR,
  ROLE_SLUGS.CULTURAL_COORDINATOR,
  ROLE_SLUGS.PLACEMENT_COORDINATOR,
];

/**
 * Returns { bg, text } color object for a role slug.
 * Replaces the old getRoleBadgeClass() which returned Tailwind class strings.
 */
export const getRoleBadgeColors = (slug: string) =>
  (roleBadgeColors as Record<string, { bg: string; text: string }>)[slug] ?? roleBadgeColors.DEFAULT;

/**
 * @deprecated Use getRoleBadgeColors() instead.
 * Kept for any residual callers until they are updated.
 */
export const getRoleBadgeClass = (slug: string): string => slug;

/**
 * Get short display name for a role slug.
 */
export const getRoleShortName = (slug: string): string => {
  const map: Record<string, string> = {
    HOD: 'HOD',
    FACULTY: 'Faculty',
    TIMETABLE_COORDINATOR: 'TT Coordinator',
    EXAM_COORDINATOR: 'Exam Coordinator',
    CULTURAL_COORDINATOR: 'Cultural Coordinator',
    PLACEMENT_COORDINATOR: 'Placement Coordinator',
  };
  return map[slug] || slug;
};

export const hasRole = (userRoles: string[] = [], slug: string): boolean =>
  userRoles.includes(slug);

export const hasAnyCoordinatorRole = (userRoles: string[] = []): boolean =>
  COORDINATOR_ROLES.some((slug) => userRoles.includes(slug));

export const getCoordinatorRoles = (roles: Role[] = []): Role[] =>
  roles.filter((r) => (COORDINATOR_ROLES as string[]).includes(r.slug));

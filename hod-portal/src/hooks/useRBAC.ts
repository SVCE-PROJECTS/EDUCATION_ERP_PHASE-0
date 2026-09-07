import { useAuth } from '../context/AuthContext';
import { ROLE_SLUGS, COORDINATOR_ROLES } from '../utils/roleUtils';

/**
 * Central RBAC hook — use this everywhere instead of reading authStore directly.
 * Returns role-check helpers so permission logic is in one place.
 */
export function useRBAC() {
  const { user, isAuthenticated } = useAuth();
  const roles = user?.roles || [];

  const isHOD = user?.isHOD === true || roles.includes(ROLE_SLUGS.HOD);
  const isFaculty = roles.includes(ROLE_SLUGS.FACULTY);
  const isTimetableCoord = roles.includes(ROLE_SLUGS.TIMETABLE_COORDINATOR);
  const isExamCoord = roles.includes(ROLE_SLUGS.EXAM_COORDINATOR);
  const isCulturalCoord = roles.includes(ROLE_SLUGS.CULTURAL_COORDINATOR);
  const isPlacementCoord = roles.includes(ROLE_SLUGS.PLACEMENT_COORDINATOR);
  const isAnyCoordinator = COORDINATOR_ROLES.some((s) => roles.includes(s));

  const can = (slug: string): boolean => roles.includes(slug);

  return {
    isAuthenticated,
    isHOD,
    isFaculty,
    isTimetableCoord,
    isExamCoord,
    isCulturalCoord,
    isPlacementCoord,
    isAnyCoordinator,
    roles,
    can,
    user,
  };
}

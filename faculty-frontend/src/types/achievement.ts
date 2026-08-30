/**
 * Achievement types — derived from:
 *   prisma/schema.prisma  (Achievement model)
 *   unified_backend/src/controllers/achievementsController.js
 *
 * Table: achievements(achievement_id, student_id, faculty_id, title,
 *                     level, type, position, certificate_url,
 *                     achievement_date, created_at, updated_at)
 */

export type AchievementType =
  | 'Hackathon'
  | 'Sports'
  | 'Cultural'
  | 'Industry'
  | 'Certification'
  | 'Publication'
  | 'Award'
  | 'Other';

export type AchievementLevel =
  | 'College'
  | 'University'
  | 'State'
  | 'National'
  | 'International';

/**
 * Row returned by GET /api/achievements?student_id=X
 */
export interface Achievement {
  achievement_id: number;
  student_id: string;           // library_id
  faculty_id: number | null;
  title: string;
  level: AchievementLevel | null;
  type: AchievementType;
  position: string | null;
  certificate_url: string | null;
  achievement_date: string | null;  // 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
  /** Present when fetching all (joined from students) */
  student_name?: string;
}

/**
 * Body for POST /api/achievements
 */
export interface AddAchievementRequest {
  student_id: string;
  title: string;
  type: AchievementType;
  level?: AchievementLevel;
  position?: string;
  certificate_url?: string;
  achievement_date?: string;
}

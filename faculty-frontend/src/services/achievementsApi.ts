/**
 * Achievements API
 *
 * Backend: unified_backend/src/routes/achievementsRoutes.js
 *          unified_backend/src/controllers/achievementsController.js
 *
 * Endpoints:
 *   GET    /api/achievements?student_id=X
 *   POST   /api/achievements
 *   PUT    /api/achievements/:id
 *   DELETE /api/achievements/:id
 *
 * All routes require Bearer token.
 *
 * Valid type values:  'Hackathon','Sports','Cultural','Industry',
 *                     'Certification','Publication','Award','Other'
 * Valid level values: 'College','University','State','National','International'
 */

import axiosInstance from '../api/axiosInstance';
import type { Achievement, AddAchievementRequest } from '../types';

/**
 * GET /api/achievements?student_id=X
 * If student_id is omitted, returns all achievements (with student_name joined).
 * If student_id is provided, returns that student's achievements only.
 */
export const getAchievements = async (params?: {
  student_id?: string;
}): Promise<Achievement[]> => {
  const response = await axiosInstance.get<never, Achievement[]>(
    '/achievements',
    { params },
  );
  return response;
};

/**
 * POST /api/achievements
 * Required: student_id, title, type
 */
export const addAchievement = async (
  data: AddAchievementRequest,
): Promise<Achievement> => {
  const response = await axiosInstance.post<never, Achievement>(
    '/achievements',
    data,
  );
  return response;
};

/**
 * PUT /api/achievements/:id
 */
export const updateAchievement = async (
  achievementId: number,
  data: Partial<AddAchievementRequest>,
): Promise<Achievement> => {
  const response = await axiosInstance.put<never, Achievement>(
    `/achievements/${achievementId}`,
    data,
  );
  return response;
};

/**
 * DELETE /api/achievements/:id
 */
export const deleteAchievement = async (
  achievementId: number,
): Promise<{ message: string; id: string }> => {
  const response = await axiosInstance.delete<
    never,
    { message: string; id: string }
  >(`/achievements/${achievementId}`);
  return response;
};

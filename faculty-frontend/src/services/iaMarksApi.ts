/**
 * IA Marks API
 *
 * Backend: unified_backend/src/routes/iaMarksRoutes.js
 *          unified_backend/src/controllers/iaMarksController.js
 *
 * Endpoints:
 *   GET    /api/ia-marks?class_id=X&student_id=Y
 *   POST   /api/ia-marks          — UPSERT on (student_id, class_id) conflict
 *   PUT    /api/ia-marks/:id      — update by ia_id
 *   DELETE /api/ia-marks/:id
 *
 * CRITICAL: `average` is a DB-generated column — NEVER include it in
 * POST / PUT request bodies.
 *
 * All routes require Bearer token.
 */

import axiosInstance from '../api/axiosInstance';
import type {
  IAMark,
  AddIAMarksRequest,
  UpdateIAMarksRequest,
} from '../types';

/**
 * GET /api/ia-marks
 * Pass class_id to get all student marks for a subject.
 * Pass student_id to get all IA marks for one student.
 * Both can be combined.
 */
export const getIAMarks = async (params: {
  class_id?: number;
  student_id?: string;
}): Promise<IAMark[]> => {
  const response = await axiosInstance.get<never, IAMark[]>('/ia-marks', {
    params,
  });
  return response;
};

/**
 * POST /api/ia-marks
 * UPSERTs on UNIQUE(student_id, class_id) conflict —
 * safe to call whether or not a record already exists.
 *
 * Required: student_id, class_id
 * Optional: ia1, ia2, ia3 (null is valid — means not yet assessed)
 */
export const addIAMarks = async (data: AddIAMarksRequest): Promise<IAMark> => {
  const response = await axiosInstance.post<never, IAMark>('/ia-marks', data);
  return response;
};

/**
 * PUT /api/ia-marks/:id
 * Updates an existing record by ia_id.
 */
export const updateIAMarks = async (
  iaId: number,
  data: UpdateIAMarksRequest,
): Promise<IAMark> => {
  const response = await axiosInstance.put<never, IAMark>(
    `/ia-marks/${iaId}`,
    data,
  );
  return response;
};

/**
 * DELETE /api/ia-marks/:id
 */
export const deleteIAMarks = async (
  iaId: number,
): Promise<{ message: string; id: string }> => {
  const response = await axiosInstance.delete<
    never,
    { message: string; id: string }
  >(`/ia-marks/${iaId}`);
  return response;
};

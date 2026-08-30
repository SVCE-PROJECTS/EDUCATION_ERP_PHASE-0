/**
 * Assignments API
 *
 * Backend: unified_backend/src/routes/assignmentRoutes.js
 *          unified_backend/src/controllers/assignmentController.js
 *
 * Endpoints:
 *   GET    /api/assignments?class_id=X&status=Open
 *   POST   /api/assignments
 *   PUT    /api/assignments/:id
 *   DELETE /api/assignments/:id
 *
 * All routes require Bearer token.
 * class_id is required for POST; it links to subjects/sections/semesters via JOIN.
 */

import axiosInstance from '../api/axiosInstance';
import type {
  Assignment,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
} from '../types';

/**
 * GET /api/assignments
 * Filter by class_id (required for faculty view) and/or status.
 */
export const getAssignments = async (params: {
  class_id?: number;
  status?: 'Open' | 'Closed';
}): Promise<Assignment[]> => {
  const response = await axiosInstance.get<never, Assignment[]>(
    '/assignments',
    { params },
  );
  return response;
};

/**
 * POST /api/assignments
 * Required: class_id, title
 * Optional: description, due_date, marks, attachment_url, status (default 'Open')
 */
export const createAssignment = async (
  data: CreateAssignmentRequest,
): Promise<Assignment> => {
  const response = await axiosInstance.post<never, Assignment>(
    '/assignments',
    data,
  );
  return response;
};

/**
 * PUT /api/assignments/:id
 * Full update — all fields in the body replace existing values.
 */
export const updateAssignment = async (
  assignmentId: number,
  data: UpdateAssignmentRequest,
): Promise<Assignment> => {
  const response = await axiosInstance.put<never, Assignment>(
    `/assignments/${assignmentId}`,
    data,
  );
  return response;
};

/**
 * DELETE /api/assignments/:id
 */
export const deleteAssignment = async (
  assignmentId: number,
): Promise<{ message: string; id: string }> => {
  const response = await axiosInstance.delete<
    never,
    { message: string; id: string }
  >(`/assignments/${assignmentId}`);
  return response;
};

/**
 * Assignment types — derived from:
 *   prisma/schema.prisma  (Assignment, AssignmentSubmission models)
 *   unified_backend/src/controllers/assignmentController.js
 *
 * Table: assignments(assignment_id, class_id, title, description,
 *                    due_date, marks, attachment_url, status, created_at, updated_at)
 *   status values: 'Open' | 'Closed'
 *
 * Table: assignment_submissions(submission_id, assignment_id, student_id,
 *                               submitted_at, file_url, marks, remarks)
 * UNIQUE (assignment_id, student_id)
 */

export type AssignmentStatus = 'Open' | 'Closed';

/**
 * Row returned by GET /api/assignments?class_id=X
 * Includes joined subject / section / semester fields.
 */
export interface Assignment {
  assignment_id: number;
  class_id: number;
  title: string;
  description: string | null;
  due_date: string | null;    // 'YYYY-MM-DD'
  marks: number;
  attachment_url: string | null;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  /** Joined from subjects via classes */
  subject_name: string;
  subject_code: string;
  /** Joined from sections */
  section_name: string;
  /** Joined from semesters */
  semester_number: number;
}

/**
 * Body for POST /api/assignments
 * class_id and title are required.
 */
export interface CreateAssignmentRequest {
  class_id: number;
  title: string;
  description?: string;
  due_date?: string;          // 'YYYY-MM-DD'
  marks?: number;
  attachment_url?: string;
  status?: AssignmentStatus;
}

/**
 * Body for PUT /api/assignments/:id
 */
export interface UpdateAssignmentRequest {
  title: string;
  description?: string;
  due_date?: string;
  marks?: number;
  attachment_url?: string;
  status: AssignmentStatus;
}

/**
 * Submission record — referenced inside student profiles
 * (no standalone submissions list endpoint exists in the backend)
 */
export interface AssignmentSubmission {
  submission_id: number;
  assignment_id: number;
  student_id: string;       // library_id
  submitted_at: string;
  file_url: string | null;
  marks: number | null;
  remarks: string | null;
}

/**
 * Faculty types — derived from:
 *   prisma/schema.prisma  (Faculty model)
 *   unified_backend/src/repositories/faculty.repository.js (normalizeFacultyRow)
 *   unified_backend/src/services/faculty.service.js        (sanitizeFaculty)
 *   unified_backend/src/controllers/faculty.controller.js  (getMyClasses)
 */

import { FacultyDepartment, FacultyProfile, FacultyRole } from './auth';

export type { FacultyProfile, FacultyDepartment, FacultyRole };

/**
 * One class entry returned by GET /api/faculty/me/classes
 * Query in faculty.controller.js → getMyClasses:
 *   class_id, academic_year,
 *   subject_id, subject_name, subject_code,
 *   section_id, section_name,
 *   semester_id, semester_number
 */
export interface FacultyClass {
  class_id: number;
  academic_year: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  section_id: number;
  section_name: string;
  semester_id: number;
  semester_number: number;
}

/**
 * Paginated faculty list response — GET /api/faculty
 * paginatedResponse from response.js utility
 */
export interface FacultyListResponse {
  success: boolean;
  data: FacultyProfile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

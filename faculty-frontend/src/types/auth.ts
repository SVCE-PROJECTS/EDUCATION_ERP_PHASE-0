/**
 * Auth types — derived from:
 *   unified_backend/src/services/authService.js  (_sanitizeFaculty)
 *   unified_backend/src/utils/jwt.js              (generateToken payload)
 *   POST /api/auth/faculty/login response shape
 */

export interface FacultyLoginRequest {
  username: string;
  password: string;
  /** Optional – HOD portal sends it; Faculty portal omits it */
  departmentCode?: string;
}

/**
 * JWT payload decoded client-side (never trust for authorisation –
 * that is the backend's job, but useful for display logic).
 */
export interface FacultyTokenPayload {
  /** employee_id string, e.g. "EMP001" */
  id: string;
  username: string;
  departmentCode: string;
  /** e.g. ['FACULTY', 'HOD', 'SPORTS_COORDINATOR'] */
  roles: string[];
  isHOD: boolean;
  /** JWT standard: expiry Unix timestamp */
  exp: number;
  iat: number;
}

export interface FacultyDepartment {
  id: number | null;
  name: string | null;
  code: string | null;
}

export interface FacultyRole {
  role: {
    id: number | null;
    name: string;
    slug: string;
  };
}

/**
 * Faculty object returned inside the login response body.
 * Field names come from faculty.repository.js → normalizeFacultyRow
 * plus faculty.service.js → sanitizeFaculty.
 */
export interface FacultyProfile {
  /** BigInt PK — pg returns as string, e.g. "1" */
  faculty_id: number | string;
  /** String identifier, e.g. "EMP001" – also the JWT `id` field */
  employeeId: string;
  employee_id?: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  qualification: string | null;
  specialization: string | null;
  experience_years: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  username: string;
  photo_url: string | null;
  photoUrl: string | null;
  departmentCode: string;
  department: FacultyDepartment;
  roles: FacultyRole[];
  isHOD: boolean;
  coordinatorRoles: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Shape returned by POST /api/auth/faculty/login
 * See authController.js → facultyLogin
 */
export interface FacultyLoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    faculty: FacultyProfile;
    isHOD: boolean;
  };
}

/**
 * What we persist in AsyncStorage after a successful login.
 */
export interface StoredAuth {
  token: string;
  faculty: FacultyProfile;
}

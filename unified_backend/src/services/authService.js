/**
 * Unified Auth Service
 * Merged from Admin-erp (authService.js) and education_erp (auth.service.js)
 * Handles both admin login (username+password) and faculty/HOD login (departmentCode+username+password)
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/response');
const { generateToken } = require('../utils/jwt');
const { logger } = require('../utils/logger');
const userRepository = require('../repositories/userRepository');
const facultyRepo = require('../repositories/faculty.repository');

const INVALID_CREDENTIALS = 'Invalid credentials.';

/**
 * Admin login — username + password only
 */
async function adminLogin({ username, password }) {
  const user = await userRepository.findByUsername(username);

  if (!user) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  const isActive = user.isActive !== false;
  if (!isActive) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, isAdmin: true },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  logger.info(`Admin login: ${username}`);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

/**
 * Faculty/HOD login — username + password (departmentCode optional)
 * If departmentCode is provided (HOD portal), it's validated against the
 * faculty's actual department. If omitted (Faculty portal), any faculty
 * member can log in with just username + password.
 */
async function facultyLogin({ departmentCode, username, password }) {
  const faculty = await facultyRepo.findByUsername(username);

  if (!faculty) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  // Only validate departmentCode when the caller explicitly provides it
  if (departmentCode && (!faculty.departmentCode || faculty.departmentCode.toUpperCase() !== departmentCode.toUpperCase())) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  if (faculty.status === 'INACTIVE') {
    throw new ApiError(403, 'Your account has been deactivated. Contact HOD.');
  }

  const isValid = await bcrypt.compare(password, faculty.passwordHash);
  if (!isValid) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  const isHOD = String(faculty.designation ?? '').toUpperCase().includes('HOD');

  const token = generateToken(faculty);

  logger.info(`Faculty login: ${username} (${faculty.departmentCode}) - ${isHOD ? 'HOD' : 'Faculty'}`);

  return {
    token,
    faculty: _sanitizeFaculty(faculty),
    isHOD,
  };
}

/**
 * Universal login — auto-detects admin vs faculty by presence of departmentCode
 */
async function login({ departmentCode, username, password }) {
  if (departmentCode) {
    return facultyLogin({ departmentCode, username, password });
  }
  return adminLogin({ username, password });
}

/**
 * Get current user profile
 */
async function getMe(userId) {
  // Try faculty first, then admin user.
  // req.user.id for faculty/HOD tokens is the employee_id string (see
  // utils/jwt.js generateToken), not the numeric faculty_id PK — must use
  // findByEmployeeId here, matching every other consumer of req.user.id
  // (attendanceController, iaMarksController, assignmentController, etc.).
  const faculty = await facultyRepo.findByEmployeeId(userId).catch(() => null);
  if (faculty) return _sanitizeFaculty(faculty);

  const user = await userRepository.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');

  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Strip sensitive fields from faculty object
 */
function _sanitizeFaculty(faculty) {
  // normalizeFacultyRow spreads the raw pg row AND adds camelCase aliases,
  // so the hash exists under both password_hash and passwordHash — dropping
  // only one leaked the raw column straight into the login response.
  const { passwordHash, password_hash, ...safe } = faculty;

  const roles = faculty.coordinatorRoles
    ? faculty.coordinatorRoles.split(',').map(r => ({
        role: { name: r.trim(), slug: r.trim() },
      }))
    : [];

  const isHOD = String(faculty.designation ?? '').toUpperCase().includes('HOD');
  if (isHOD) {
    roles.push({ role: { name: 'Faculty', slug: 'FACULTY' } });
    roles.push({ role: { name: 'HOD', slug: 'HOD' } });
  }

  return { ...safe, roles, isHOD };
}

module.exports = { login, adminLogin, facultyLogin, getMe };

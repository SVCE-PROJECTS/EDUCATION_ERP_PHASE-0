const { query } = require('../config/db');

function normalizeFacultyRow(row) {
  if (!row) return null;
  return {
    ...row,
    departmentCode: row.department_code || row.departmentCode || null,
    passwordHash: row.password_hash || row.passwordHash || null,
    coordinatorRoles: row.coordinator_roles || row.coordinatorRoles || null,
    isHod: row.is_hod ?? row.isHod ?? false,
    experienceYears: row.experience_years ?? row.experienceYears ?? null,
    employeeId: row.employee_id || row.employeeId || null,
    facultyId: row.faculty_id || row.facultyId || null,
    photoUrl: row.photo_url || row.photoUrl || null,
    departmentId: row.department_id || row.departmentId || null,
  };
}

/**
 * Find faculty by username (for login)
 */
const findByUsername = async (username) => {
  const result = await query(
    `SELECT f.*, d.department_code
     FROM faculty f
     JOIN departments d ON d.department_id = f.department_id
     WHERE f.username = $1`,
    [username],
  );
  return normalizeFacultyRow(result.rows[0] || null);
};

/**
 * Find faculty by faculty_id (numeric PK).
 * Used by authService.getMe which passes the numeric id from the JWT payload.
 */
const findById = async (facultyId) => {
  const result = await query(
    `SELECT f.*, d.department_code
     FROM faculty f
     JOIN departments d ON d.department_id = f.department_id
     WHERE f.faculty_id = $1`,
    [facultyId],
  );
  return normalizeFacultyRow(result.rows[0] || null);
};

/**
 * Find faculty by employee_id (string identifier).
 */
const findByEmployeeId = async (employeeId) => {
  const result = await query(
    `SELECT f.*, d.department_code
     FROM faculty f
     JOIN departments d ON d.department_id = f.department_id
     WHERE f.employee_id = $1`,
    [employeeId],
  );
  return normalizeFacultyRow(result.rows[0] || null);
};

/**
 * Get paginated faculty list for a department with search/filter/sort.
 * departmentCode is matched via JOIN to departments.
 */
const findAllByDepartment = async (departmentCode, {
  page = 1, limit = 20, search, status, sortBy = 'name', sortOrder = 'asc',
} = {}) => {
  const offset = (page - 1) * limit;
  const conditions = ['d.department_code = $1'];
  const params = [departmentCode];
  let idx = 2;

  if (status) {
    conditions.push(`f.status = $${idx}`);
    params.push(status);
    idx++;
  }
  if (search) {
    conditions.push(
      `(f.name ILIKE $${idx} OR f.employee_id ILIKE $${idx} OR f.designation ILIKE $${idx} OR f.email ILIKE $${idx} OR f.specialization ILIKE $${idx})`,
    );
    params.push(`%${search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const validSort = {
    name: 'f.name',
    employee_id: 'f.employee_id',
    designation: 'f.designation',
    experience_years: 'f.experience_years',
    status: 'f.status',
  };
  const sortCol = validSort[sortBy] || 'f.name';
  const dir = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const [data, count] = await Promise.all([
    query(
      `SELECT f.*, d.department_code
       FROM faculty f
       JOIN departments d ON d.department_id = f.department_id
       ${where}
       ORDER BY ${sortCol} ${dir}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM faculty f
       JOIN departments d ON d.department_id = f.department_id
       ${where}`,
      params,
    ),
  ]);

  return { items: data.rows.map(normalizeFacultyRow), total: count.rows[0].total };
};

/**
 * Create a faculty record
 */
const create = async (data) => {
  const result = await query(
    `INSERT INTO faculty
       (employee_id, name, email, phone, designation, qualification, specialization,
        experience_years, department_id, photo_url, username, password_hash,
        coordinator_roles, is_hod, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.employee_id || data.employeeId,
      data.name,
      data.email || null,
      data.phone || null,
      data.designation || null,
      data.qualification || null,
      data.specialization || null,
      data.experience_years ?? data.experienceYears ?? null,
      data.department_id || data.departmentId,
      data.photo_url || data.photoUrl || null,
      data.username || null,
      data.password_hash || data.passwordHash || null,
      data.coordinator_roles || data.coordinatorRoles || null,
      data.is_hod ?? data.isHod ?? false,
      data.status || 'ACTIVE',
    ],
  );
  return normalizeFacultyRow(result.rows[0]);
};

/**
 * Update a faculty record by employee_id
 */
const update = async (employeeId, data) => {
  const fields = [];
  const params = [];
  let idx = 1;

  const fieldMap = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    designation: 'designation',
    qualification: 'qualification',
    specialization: 'specialization',
    experienceYears: 'experience_years',
    experience_years: 'experience_years',
    departmentId: 'department_id',
    department_id: 'department_id',
    photoUrl: 'photo_url',
    photo_url: 'photo_url',
    username: 'username',
    passwordHash: 'password_hash',
    password_hash: 'password_hash',
    coordinatorRoles: 'coordinator_roles',
    coordinator_roles: 'coordinator_roles',
    isHod: 'is_hod',
    is_hod: 'is_hod',
    status: 'status',
  };

  // Deduplicate — last camelCase or snake_case wins
  const seen = new Set();
  Object.entries(fieldMap).forEach(([key, col]) => {
    if (data[key] !== undefined && !seen.has(col)) {
      seen.add(col);
      fields.push(`${col} = $${idx}`);
      params.push(data[key]);
      idx++;
    }
  });

  if (!fields.length) return findByEmployeeId(employeeId);

  fields.push('updated_at = NOW()');
  params.push(employeeId);

  const result = await query(
    `UPDATE faculty SET ${fields.join(', ')} WHERE employee_id = $${idx} RETURNING *`,
    params,
  );
  return normalizeFacultyRow(result.rows[0] || null);
};

/**
 * Delete a faculty record by employee_id
 */
const remove = async (employeeId) => {
  const result = await query(
    'DELETE FROM faculty WHERE employee_id = $1 RETURNING employee_id',
    [employeeId],
  );
  return result.rowCount > 0;
};

/**
 * Check uniqueness of employee_id, username, or email.
 * excludeEmployeeId omits the current record when updating.
 */
const checkUnique = async (fields, excludeEmployeeId = null) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (fields.employeeId || fields.employee_id) {
    conditions.push(`f.employee_id = $${idx}`);
    params.push(fields.employeeId || fields.employee_id);
    idx++;
  }
  if (fields.username) {
    conditions.push(`f.username = $${idx}`);
    params.push(fields.username);
    idx++;
  }
  if (fields.email) {
    conditions.push(`f.email = $${idx}`);
    params.push(fields.email);
    idx++;
  }

  if (!conditions.length) return null;

  let sql = `SELECT employee_id, username, email FROM faculty f WHERE (${conditions.join(' OR ')})`;
  if (excludeEmployeeId) {
    sql += ` AND f.employee_id <> $${idx}`;
    params.push(excludeEmployeeId);
  }
  sql += ' LIMIT 1';

  const result = await query(sql, params);
  return result.rows[0] || null;
};

/**
 * Dashboard stats for a department.
 * Status values match the schema CHECK: 'ACTIVE', 'INACTIVE', 'ON_LEAVE'
 */
const getDepartmentStats = async (departmentCode) => {
  const result = await query(
    `SELECT
       COUNT(*)::int                                               AS "totalFaculty",
       COUNT(*) FILTER (WHERE f.status = 'ACTIVE')::int           AS "activeCount",
       COUNT(*) FILTER (WHERE f.status = 'ON_LEAVE')::int         AS "onLeave",
       COUNT(*) FILTER (WHERE f.status = 'INACTIVE')::int         AS "inactive",
       COUNT(*) FILTER (WHERE f.coordinator_roles IS NOT NULL)::int AS "coordinatorCount",
       -- FIXED: totalStudents was hardcoded to 0 in dashboard.service.js
       -- instead of being queried at all. Counting here, in the same
       -- department-scoped query, is the simplest correct fix.
       (SELECT COUNT(*)::int FROM students s2
          JOIN departments d2 ON d2.department_id = s2.department_id
          WHERE d2.department_code = $1)                          AS "totalStudents"
     FROM faculty f
     JOIN departments d ON d.department_id = f.department_id
     WHERE d.department_code = $1`,
    [departmentCode],
  );
  return result.rows[0];
};

module.exports = {
  findByUsername,
  findById,
  findByEmployeeId,
  findAllByDepartment,
  create,
  update,
  remove,
  checkUnique,
  getDepartmentStats,
};

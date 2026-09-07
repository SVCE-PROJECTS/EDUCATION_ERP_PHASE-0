const { query } = require('../config/db');

const ACTIVITY_TYPE = 'IndustryProject';

const findAll = async (departmentCode, {
  page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'desc',
} = {}) => {
  const offset = (page - 1) * limit;
  const conditions = ['a.activity_type = $1'];
  const params = [ACTIVITY_TYPE];
  let idx = 2;

  if (departmentCode) {
    conditions.push(`d.department_code = $${idx}`);
    params.push(departmentCode);
    idx++;
  }
  if (search) {
    conditions.push(`(a.title ILIKE $${idx} OR s.name ILIKE $${idx} OR s.usn ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const validSort = {
    created_at: 'a.created_at',
    title: 'a.title',
    academic_year: 'a.academic_year',
    status: 'a.status',
  };
  const sortCol = validSort[sortBy] || 'a.created_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const [data, count] = await Promise.all([
    query(
      `SELECT a.*, a.activity_id AS id, s.name AS student_name, s.usn, d.department_code
       FROM activities a
       JOIN students s ON s.library_id = a.student_id
       JOIN departments d ON d.department_id = s.department_id
       ${where}
       ORDER BY ${sortCol} ${dir}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM activities a
       JOIN students s ON s.library_id = a.student_id
       JOIN departments d ON d.department_id = s.department_id
       ${where}`,
      params,
    ),
  ]);

  return { items: data.rows, total: count.rows[0].total };
};

const findById = async (id) => {
  const result = await query(
    `SELECT a.*, a.activity_id AS id, s.name AS student_name, s.usn, d.department_code
     FROM activities a
     JOIN students s ON s.library_id = a.student_id
     JOIN departments d ON d.department_id = s.department_id
     WHERE a.activity_id = $1 AND a.activity_type = $2`,
    [id, ACTIVITY_TYPE],
  );
  return result.rows[0] || null;
};

const create = async (data) => {
  const result = await query(
    `INSERT INTO activities
       (student_id, faculty_id, activity_type, title, description, academic_year, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *, activity_id AS id`,
    [
      data.studentId,
      data.facultyId || null,
      ACTIVITY_TYPE,
      data.title,
      data.description || null,
      data.academicYear || null,
      data.status || 'Ongoing',
    ],
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const fields = [];
  const params = [];
  let idx = 1;
  const fieldMap = {
    title: 'title',
    description: 'description',
    academicYear: 'academic_year',
    academic_year: 'academic_year',
    status: 'status',
  };
  const seen = new Set();
  Object.entries(fieldMap).forEach(([key, col]) => {
    if (data[key] !== undefined && !seen.has(col)) {
      seen.add(col);
      fields.push(`${col} = $${idx}`);
      params.push(data[key]);
      idx++;
    }
  });
  if (!fields.length) return findById(id);
  params.push(ACTIVITY_TYPE);
  const actTypeIdx = idx++;
  params.push(id);
  const result = await query(
    `UPDATE activities SET ${fields.join(', ')}
     WHERE activity_type = $${actTypeIdx} AND activity_id = $${idx}
     RETURNING *, activity_id AS id`,
    params,
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query(
    'DELETE FROM activities WHERE activity_id = $1 AND activity_type = $2 RETURNING activity_id',
    [id, ACTIVITY_TYPE],
  );
  return result.rowCount > 0;
};

/**
 * Add a student to an IndustryProject by inserting a new activities row linked
 * to the same project title and faculty.
 */
const addStudent = async (projectActivityId, studentData) => {
  const parent = await findById(projectActivityId);
  if (!parent) throw new Error(`IndustryProject activity ${projectActivityId} not found`);

  const result = await query(
    `INSERT INTO activities
       (student_id, faculty_id, activity_type, title, description, academic_year, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *, activity_id AS id`,
    [
      studentData.studentId,
      studentData.facultyId || parent.faculty_id || null,
      ACTIVITY_TYPE,
      studentData.title || parent.title,
      studentData.description || parent.description || null,
      studentData.academicYear || parent.academic_year || null,
      studentData.status || parent.status || 'Ongoing',
    ],
  );
  return result.rows[0];
};

/**
 * Remove a student's individual IndustryProject activity entry by activity_id.
 */
const removeStudent = async (activityId) => {
  const result = await query(
    `DELETE FROM activities
     WHERE activity_id = $1 AND activity_type = $2
     RETURNING activity_id`,
    [activityId, ACTIVITY_TYPE],
  );
  return result.rowCount > 0;
};

module.exports = { findAll, findById, create, update, remove, addStudent, removeStudent };

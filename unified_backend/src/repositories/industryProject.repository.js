const { query } = require('../config/db');

const ACTIVITY_TYPE = 'IndustryProject';

// Uses LEFT JOINs so that project-header rows (student_id IS NULL) are
// included in the list. Department scoping falls back to the faculty's
// department when no student is linked.
const findAll = async (departmentCode, {
  page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'desc',
} = {}) => {
  const offset = (page - 1) * limit;
  const conditions = ['a.activity_type = $1'];
  const params = [ACTIVITY_TYPE];
  let idx = 2;

  if (departmentCode) {
    conditions.push(
      `(d.department_code = $${idx} OR (a.student_id IS NULL AND fd.department_code = $${idx}))`
    );
    params.push(departmentCode);
    idx++;
  }
  if (search) {
    conditions.push(
      `(a.title ILIKE $${idx} OR s.name ILIKE $${idx} OR s.usn ILIKE $${idx})`
    );
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

  const joins = `
    LEFT JOIN students s ON s.library_id = a.student_id
    LEFT JOIN departments d ON d.department_id = s.department_id
    LEFT JOIN faculty f ON f.faculty_id = a.faculty_id
    LEFT JOIN departments fd ON fd.department_id = f.department_id
  `;

  const [data, count] = await Promise.all([
    query(
      `SELECT a.*, a.activity_id AS id, s.name AS student_name, s.usn,
              COALESCE(d.department_code, fd.department_code) AS department_code
       FROM activities a
       ${joins}
       ${where}
       ORDER BY ${sortCol} ${dir}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM activities a
       ${joins}
       ${where}`,
      params,
    ),
  ]);

  return { items: data.rows, total: count.rows[0].total };
};

const findById = async (id) => {
  const result = await query(
    `SELECT a.*, a.activity_id AS id, s.name AS student_name, s.usn,
            COALESCE(d.department_code, fd.department_code) AS department_code
     FROM activities a
     LEFT JOIN students s ON s.library_id = a.student_id
     LEFT JOIN departments d ON d.department_id = s.department_id
     LEFT JOIN faculty f ON f.faculty_id = a.faculty_id
     LEFT JOIN departments fd ON fd.department_id = f.department_id
     WHERE a.activity_id = $1 AND a.activity_type = $2`,
    [id, ACTIVITY_TYPE],
  );
  return result.rows[0] || null;
};

// student_id may be NULL for project-header rows (no students yet).
const create = async (data) => {
  const result = await query(
    `INSERT INTO activities
       (student_id, faculty_id, activity_type, title, description, academic_year, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *, activity_id AS id`,
    [
      data.studentId || null,
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
 * Delete ALL activities rows that share the same title + academic_year
 * (i.e. delete the whole project including all student rows and the header).
 */
const removeProject = async (title, academicYear) => {
  const result = await query(
    `DELETE FROM activities
     WHERE activity_type = $1 AND title = $2 AND academic_year IS NOT DISTINCT FROM $3
     RETURNING activity_id`,
    [ACTIVITY_TYPE, title, academicYear || null],
  );
  return result.rowCount;
};

/**
 * Add a student to a project by inserting a new activities row that shares
 * the same title, academic_year, status and faculty as the parent row.
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

/**
 * Find the per-student activity row for a given project (rows sharing the same
 * title + academic_year). Used to dedupe / look up a student by their
 * library_id (not USN).
 */
const findByStudentInProject = async (title, academicYear, studentId) => {
  const result = await query(
    `SELECT *, activity_id AS id FROM activities
     WHERE activity_type = $1 AND title = $2
       AND academic_year IS NOT DISTINCT FROM $3
       AND student_id = $4`,
    [ACTIVITY_TYPE, title, academicYear || null, studentId],
  );
  return result.rows[0] || null;
};

/**
 * Find the header row for a project (student_id IS NULL) by title + academic_year.
 * Returns null if no header exists (legacy rows without a header are fine —
 * the first student row is used as the representative).
 */
const findProjectHeader = async (title, academicYear) => {
  const result = await query(
    `SELECT *, activity_id AS id FROM activities
     WHERE activity_type = $1 AND title = $2
       AND academic_year IS NOT DISTINCT FROM $3
       AND student_id IS NULL
     LIMIT 1`,
    [ACTIVITY_TYPE, title, academicYear || null],
  );
  return result.rows[0] || null;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  removeProject,
  addStudent,
  removeStudent,
  findByStudentInProject,
  findProjectHeader,
};

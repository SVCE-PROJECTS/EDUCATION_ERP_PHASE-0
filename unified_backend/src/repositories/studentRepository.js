/**
 * Unified Student Repository
 * Pure pg — no Prisma.
 *
 * Primary key: library_id (VARCHAR 50) — Task 1 change.
 * All lookup methods accept the library_id string as the id parameter.
 */

const { query } = require('../config/db');

// ─── Base SELECT ──────────────────────────────────────────────────────────────

const SELECT_BASE = `
  SELECT
    s.library_id   AS "id",
    s.name,
    s.phone,
    s.email,
    s.gender,
    s.library_id   AS "libraryId",
    s.usn,
    s.academic_year AS "academicYear",
    s.status,
    s.semester_id  AS "semesterId",
    sem.semester_number AS "semester",
    s.program_id   AS "programId",    p.program_name    AS "programName",
    s.department_id AS "departmentId", d.department_name AS "departmentName",
    s.section_id   AS "sectionId",    sec.section_name  AS "sectionName",
    s.created_at   AS "createdAt",
    s.updated_at   AS "updatedAt"
  FROM students s
  JOIN programs    p   ON p.program_id    = s.program_id
  JOIN departments d   ON d.department_id = s.department_id
  JOIN semesters   sem ON sem.semester_id = s.semester_id
  JOIN sections    sec ON sec.section_id  = s.section_id
`;

const SORT_COLUMN_MAP = {
  name:          's.name',
  usn:           's.usn',
  academic_year: 's.academic_year',
  semester:      'sem.semester_number',
  created_at:    's.created_at',
};

// ─── Admin-erp methods ────────────────────────────────────────────────────────

async function findAll({
  page = 1, pageSize = 20,
  sortBy = 'created_at', sortOrder = 'desc',
  search, programId, departmentId, sectionId, semester, academicYear,
} = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(s.name ILIKE $${idx} OR s.usn ILIKE $${idx} OR s.library_id ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (programId)    { conditions.push(`s.program_id = $${idx}`);        params.push(programId);    idx++; }
  if (departmentId) { conditions.push(`s.department_id = $${idx}`);     params.push(departmentId); idx++; }
  if (sectionId)    { conditions.push(`s.section_id = $${idx}`);        params.push(sectionId);    idx++; }
  if (semester)     { conditions.push(`sem.semester_number = $${idx}`); params.push(semester);     idx++; }
  if (academicYear) { conditions.push(`s.academic_year = $${idx}`);     params.push(academicYear); idx++; }

  const where     = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortCol   = SORT_COLUMN_MAP[sortBy] || 's.created_at';
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const offset    = (page - 1) * pageSize;

  const [dataResult, countResult] = await Promise.all([
    query(
      `${SELECT_BASE} ${where} ORDER BY ${sortCol} ${direction} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM students s
       JOIN semesters sem ON sem.semester_id = s.semester_id
       ${where}`,
      params,
    ),
  ]);

  return { rows: dataResult.rows, total: countResult.rows[0].total };
}

async function findById(libraryId) {
  const result = await query(`${SELECT_BASE} WHERE s.library_id = $1`, [libraryId]);
  return result.rows[0] || null;
}

// Added to support looking students up by USN — the identifier actually
// shown in the Student Management screen — instead of requiring the raw
// internal library_id, which was never visible anywhere in the app.
async function findByUsn(usn) {
  const result = await query(
    `SELECT s.library_id, s.name, s.usn, sem.semester_number, sec.section_name,
            d.department_code
     FROM students s
     JOIN semesters   sem ON sem.semester_id  = s.semester_id
     JOIN sections    sec ON sec.section_id   = s.section_id
     JOIN departments d   ON d.department_id  = s.department_id
     WHERE s.usn = $1`,
    [usn],
  );
  return result.rows[0] || null;
}

// Same as findByUsn, but returns light-weight name+USN matches for
// autocomplete — callers still resolve the exact record via findByUsn
// (or the id embedded in each suggestion) before writing anything.
async function searchByName(name, departmentCode, limit = 10) {
  const conditions = ['s.name ILIKE $1'];
  const params = [`%${name}%`];
  let idx = 2;
  if (departmentCode) {
    conditions.push(`d.department_code = $${idx}`);
    params.push(departmentCode);
    idx++;
  }
  params.push(limit);
  const result = await query(
    `SELECT s.library_id, s.name, s.usn, sem.semester_number, sec.section_name
     FROM students s
     JOIN semesters   sem ON sem.semester_id  = s.semester_id
     JOIN sections    sec ON sec.section_id   = s.section_id
     JOIN departments d   ON d.department_id  = s.department_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.name ASC
     LIMIT $${idx}`,
    params,
  );
  return result.rows;
}

async function create(data) {
  const semResult = await query(
    'SELECT semester_id FROM semesters WHERE semester_number = $1',
    [data.semester],
  );
  if (!semResult.rows.length) throw new Error(`Invalid semester number: ${data.semester}`);
  const semesterId = semResult.rows[0].semester_id;

  if (!data.libraryId) throw new Error('libraryId is required to create a student.');

  await query(
    `INSERT INTO students
       (library_id, name, phone, email, gender, usn, academic_year,
        program_id, department_id, semester_id, section_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      data.libraryId,
      data.name,
      data.phone       || null,
      data.email       || null,
      data.gender,
      data.usn         || null,
      data.academicYear,
      data.programId,
      data.departmentId,
      semesterId,
      data.sectionId,
    ],
  );
  return findById(data.libraryId);
}

async function update(libraryId, data) {
  const fields = [];
  const params = [];
  let idx = 1;

  if (data.semester !== undefined) {
    const semResult = await query(
      'SELECT semester_id FROM semesters WHERE semester_number = $1',
      [data.semester],
    );
    if (!semResult.rows.length) throw new Error(`Invalid semester number: ${data.semester}`);
    data.semesterId = semResult.rows[0].semester_id;
  }

  const fieldMap = {
    name:         'name',
    phone:        'phone',
    email:        'email',
    gender:       'gender',
    libraryId:    'library_id',
    usn:          'usn',
    academicYear: 'academic_year',
    programId:    'program_id',
    departmentId: 'department_id',
    semesterId:   'semester_id',
    sectionId:    'section_id',
    status:       'status',
  };

  Object.entries(fieldMap).forEach(([key, col]) => {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${idx}`);
      params.push(data[key]);
      idx++;
    }
  });

  if (!fields.length) return findById(libraryId);

  fields.push('updated_at = NOW()');
  params.push(libraryId);

  await query(
    `UPDATE students SET ${fields.join(', ')} WHERE library_id = $${idx}`,
    params,
  );
  // If library_id itself was updated, return by new value; else by original
  return findById(data.libraryId || libraryId);
}

async function remove(libraryId) {
  const result = await query('DELETE FROM students WHERE library_id = $1', [libraryId]);
  return result.rowCount > 0;
}

async function setStatus(libraryId, status) {
  await query(
    'UPDATE students SET status = $1, updated_at = NOW() WHERE library_id = $2',
    [status, libraryId],
  );
}

// ─── education_erp method (used by studentList.service) ──────────────────────

async function getStudentsBySectionId(sectionId) {
  const result = await query(
    `SELECT
       s.library_id  AS id,
       s.usn,
       s.name,
       s.phone,
       s.email,
       att.attendance_percentage  AS "attendancePercentage",
       perf.performance_percentage AS "performancePercentage"
     FROM students s
     LEFT JOIN (
       SELECT student_id,
              ROUND(
                100.0 * SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0),
                2
              ) AS attendance_percentage
       FROM attendance
       GROUP BY student_id
     ) att  ON att.student_id  = s.library_id
     LEFT JOIN (
       SELECT student_id,
              ROUND(AVG((COALESCE(ia1,0) + COALESCE(ia2,0) + COALESCE(ia3,0)) / 3.0), 2) AS performance_percentage
       FROM ia_marks
       GROUP BY student_id
     ) perf ON perf.student_id = s.library_id
     WHERE s.section_id = $1
     ORDER BY s.usn ASC`,
    [sectionId],
  );

  return result.rows.map(r => ({
    id:    r.id,
    usn:   r.usn,
    name:  r.name,
    phone: r.phone,
    email: r.email,
    attendance:  r.attendancePercentage  != null
      ? { attendancePercentage:  parseFloat(r.attendancePercentage) }
      : null,
    performance: r.performancePercentage != null
      ? { performancePercentage: parseFloat(r.performancePercentage) }
      : null,
  }));
}

module.exports = {
  findAll,
  findById,
  findByUsn,
  searchByName,
  create,
  update,
  remove,
  setStatus,
  SELECT_BASE,
  getStudentsBySectionId,
};

const { query } = require('../config/db');

function normalizeSubjectRow(row) {
  if (!row) return null;
  return {
    id: row.subject_id,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    credits: row.credits,
    programId: row.program_id,
    semesterId: row.semester_id,
    semesterNumber: row.semester_number ?? null,
    departmentId: row.department_id,
  };
}

const SubjectRepository = {
  /**
   * List subjects for a department, optionally filtered to one semester.
   * Scoped by department_code (not id) so callers can pass req.user.departmentCode
   * straight through — one less round trip to resolve the id first.
   */
  async findAllByDepartment(departmentCode, { semesterNumber } = {}) {
    const conditions = ['d.department_code = $1'];
    const params = [departmentCode];
    if (semesterNumber) {
      conditions.push(`sem.semester_number = $${params.length + 1}`);
      params.push(semesterNumber);
    }
    const result = await query(
      `SELECT sub.subject_id, sub.subject_code, sub.subject_name, sub.credits,
              sub.program_id, sub.semester_id, sem.semester_number, sub.department_id
       FROM subjects sub
       JOIN departments d ON d.department_id = sub.department_id
       JOIN semesters sem ON sem.semester_id = sub.semester_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sem.semester_number ASC, sub.subject_code ASC`,
      params,
    );
    return result.rows.map(normalizeSubjectRow);
  },

  async findById(subjectId) {
    const result = await query(
      `SELECT subject_id, subject_code, subject_name, credits, program_id, semester_id, department_id
       FROM subjects WHERE subject_id = $1`,
      [subjectId],
    );
    return normalizeSubjectRow(result.rows[0]);
  },

  async create({ subjectCode, subjectName, credits, programId, semesterId, departmentId }) {
    const result = await query(
      `INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING subject_id, subject_code, subject_name, credits, program_id, semester_id, department_id`,
      [subjectCode, subjectName, credits ?? null, programId, semesterId, departmentId],
    );
    return normalizeSubjectRow(result.rows[0]);
  },

  async update(subjectId, { subjectCode, subjectName, credits, programId, semesterId }) {
    const result = await query(
      `UPDATE subjects
       SET subject_code = COALESCE($2, subject_code),
           subject_name = COALESCE($3, subject_name),
           credits      = COALESCE($4, credits),
           program_id   = COALESCE($5, program_id),
           semester_id  = COALESCE($6, semester_id),
           updated_at   = NOW()
       WHERE subject_id = $1
       RETURNING subject_id, subject_code, subject_name, credits, program_id, semester_id, department_id`,
      [subjectId, subjectCode ?? null, subjectName ?? null, credits ?? null, programId ?? null, semesterId ?? null],
    );
    return normalizeSubjectRow(result.rows[0]);
  },

  async remove(subjectId) {
    const result = await query('DELETE FROM subjects WHERE subject_id = $1 RETURNING subject_id', [subjectId]);
    return result.rowCount > 0;
  },
};

module.exports = SubjectRepository;

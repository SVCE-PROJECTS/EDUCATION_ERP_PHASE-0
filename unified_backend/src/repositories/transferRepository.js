const { query } = require('../config/db');

/**
 * Create a student_transfers record.
 * Accepts an optional pg client (for transaction support) or falls back to the pool.
 *
 * Unified schema columns:
 *   old_program_id, old_department_id, old_semester_id, old_section_id
 *   new_program_id, new_department_id, new_semester_id, new_section_id
 *   reason, document_url, transfer_date
 *
 * Caller may pass semester_number values; this function resolves them to
 * semester_id automatically if the value is numeric (not already an ID).
 */
async function createTransfer(client, data) {
  const run = client
    ? (sql, params) => client.query(sql, params)
    : (sql, params) => query(sql, params);

  // Resolve old semester number → semester_id
  let oldSemesterId = data.oldSemesterId || data.old_semester_id || null;
  if (!oldSemesterId && (data.previousSemester || data.oldSemesterNumber)) {
    const num = data.previousSemester || data.oldSemesterNumber;
    const r = await run('SELECT semester_id FROM semesters WHERE semester_number = $1', [num]);
    if (r.rows.length) oldSemesterId = r.rows[0].semester_id;
  }

  // Resolve new semester number → semester_id
  let newSemesterId = data.newSemesterId || data.new_semester_id || null;
  if (!newSemesterId && (data.newSemester || data.newSemesterNumber)) {
    const num = data.newSemester || data.newSemesterNumber;
    const r = await run('SELECT semester_id FROM semesters WHERE semester_number = $1', [num]);
    if (r.rows.length) newSemesterId = r.rows[0].semester_id;
  }

  const result = await run(
    `INSERT INTO student_transfers
       (student_id,
        old_program_id, old_department_id, old_semester_id, old_section_id,
        new_program_id, new_department_id, new_semester_id, new_section_id,
        reason, document_url, transfer_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, CURRENT_DATE))
     RETURNING transfer_id`,
    [
      data.studentId,
      data.oldProgramId     || data.previousProgramId     || data.old_program_id     || null,
      data.oldDepartmentId  || data.previousDepartmentId  || data.old_department_id  || null,
      oldSemesterId,
      data.oldSectionId     || data.previousSectionId     || data.old_section_id     || null,
      data.newProgramId     || data.new_program_id        || null,
      data.newDepartmentId  || data.new_department_id     || null,
      newSemesterId,
      data.newSectionId     || data.new_section_id        || null,
      data.reason           || data.remarks               || null,
      data.documentUrl      || data.supportingDocumentUrl || data.document_url       || null,
      data.transferDate     || data.transfer_date         || null,
    ],
  );
  return result.rows[0].transfer_id;
}

/**
 * Get all transfers for a student, newest first.
 */
async function findByStudentId(studentId) {
  const result = await query(
    `SELECT
       t.transfer_id AS id,
       t.old_program_id AS "oldProgramId",       op.program_name AS "oldProgramName",
       t.old_department_id AS "oldDepartmentId", od.department_name AS "oldDepartmentName",
       t.old_semester_id AS "oldSemesterId",      os.semester_number AS "oldSemester",
       t.old_section_id AS "oldSectionId",        osec.section_name AS "oldSectionName",
       t.new_program_id AS "newProgramId",         np.program_name AS "newProgramName",
       t.new_department_id AS "newDepartmentId",  nd.department_name AS "newDepartmentName",
       t.new_semester_id AS "newSemesterId",       ns.semester_number AS "newSemester",
       t.new_section_id AS "newSectionId",         nsec.section_name AS "newSectionName",
       t.reason,
       t.document_url AS "documentUrl",
       t.transfer_date AS "transferDate"
     FROM student_transfers t
     LEFT JOIN programs      op   ON op.program_id    = t.old_program_id
     LEFT JOIN departments   od   ON od.department_id = t.old_department_id
     LEFT JOIN semesters     os   ON os.semester_id   = t.old_semester_id
     LEFT JOIN sections      osec ON osec.section_id  = t.old_section_id
     LEFT JOIN programs      np   ON np.program_id    = t.new_program_id
     LEFT JOIN departments   nd   ON nd.department_id = t.new_department_id
     LEFT JOIN semesters     ns   ON ns.semester_id   = t.new_semester_id
     LEFT JOIN sections      nsec ON nsec.section_id  = t.new_section_id
     WHERE t.student_id = $1
     ORDER BY t.transfer_date DESC`,
    [studentId],
  );
  return result.rows;
}

/**
 * Every transfer, newest first — old + new department/program/semester/section
 * for each, plus who was transferred. Backs the admin Dashboard's "Transferred
 * Students" detail view and its Excel/PDF export.
 */
async function findAll() {
  const result = await query(
    `SELECT
       t.transfer_id AS id,
       t.student_id AS "studentId",
       s.name AS "studentName",
       s.usn,
       t.old_program_id AS "oldProgramId",       op.program_name AS "oldProgramName",
       t.old_department_id AS "oldDepartmentId", od.department_name AS "oldDepartmentName",
       t.old_semester_id AS "oldSemesterId",      os.semester_number AS "oldSemester",
       t.old_section_id AS "oldSectionId",        osec.section_name AS "oldSectionName",
       t.new_program_id AS "newProgramId",         np.program_name AS "newProgramName",
       t.new_department_id AS "newDepartmentId",  nd.department_name AS "newDepartmentName",
       t.new_semester_id AS "newSemesterId",       ns.semester_number AS "newSemester",
       t.new_section_id AS "newSectionId",         nsec.section_name AS "newSectionName",
       t.reason,
       t.document_url AS "documentUrl",
       t.transfer_date AS "transferDate"
     FROM student_transfers t
     JOIN students            s    ON s.library_id     = t.student_id
     LEFT JOIN programs      op   ON op.program_id    = t.old_program_id
     LEFT JOIN departments   od   ON od.department_id = t.old_department_id
     LEFT JOIN semesters     os   ON os.semester_id   = t.old_semester_id
     LEFT JOIN sections      osec ON osec.section_id  = t.old_section_id
     LEFT JOIN programs      np   ON np.program_id    = t.new_program_id
     LEFT JOIN departments   nd   ON nd.department_id = t.new_department_id
     LEFT JOIN semesters     ns   ON ns.semester_id   = t.new_semester_id
     LEFT JOIN sections      nsec ON nsec.section_id  = t.new_section_id
     ORDER BY t.transfer_date DESC`,
  );
  return result.rows;
}

module.exports = {
  createTransfer, findByStudentId, findAll,
};

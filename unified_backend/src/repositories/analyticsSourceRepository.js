/**
 * Analytics Source Repository
 *
 * Parameterized PostgreSQL queries that extract data for the DuckDB refresh
 * and for reconciliation checks. All queries are read-only SELECTs.
 *
 * Schema notes (verified from unified_schema.sql and attendanceController.js):
 *   attendance.student_id  → students.library_id  (VARCHAR, not numeric)
 *   attendance.status      → 'Present' | 'Absent'  (capital first letter)
 *   attendance has NO updated_at — full-snapshot refresh is used
 *   classes.faculty_id     → faculty.faculty_id    (BIGINT)
 */

'use strict';

const { pool } = require('../config/db');

/**
 * Fetch all attendance rows joined to the dimension fields needed for
 * the attendance_fact DuckDB table. Runs inside a read-committed snapshot.
 *
 * Returns:
 *   { attendance_id, student_id, class_id, attendance_date, status,
 *     subject_id, section_id, semester_id, department_id, faculty_id,
 *     academic_year }
 */
const fetchAllAttendanceFact = async () => {
  const result = await pool.query(`
    SELECT
      a.attendance_id,
      a.student_id,
      a.class_id,
      a.attendance_date,
      a.status,
      c.subject_id,
      c.section_id,
      c.semester_id,
      f.department_id,
      c.faculty_id,
      c.academic_year
    FROM attendance a
    JOIN classes c ON c.class_id = a.class_id
    JOIN faculty f ON f.faculty_id = c.faculty_id
    ORDER BY a.attendance_id
  `);
  return result.rows;
};

/**
 * Count totals in PostgreSQL for reconciliation against DuckDB.
 * Returns a single row: { total_rows, present_rows, absent_rows, distinct_students, distinct_classes }
 */
const fetchAttendanceCounts = async () => {
  const result = await pool.query(`
    SELECT
      COUNT(*)                                          AS total_rows,
      COUNT(*) FILTER (WHERE a.status = 'Present')     AS present_rows,
      COUNT(*) FILTER (WHERE a.status = 'Absent')      AS absent_rows,
      COUNT(DISTINCT a.student_id)                     AS distinct_students,
      COUNT(DISTINCT a.class_id)                       AS distinct_classes
    FROM attendance a
  `);
  return result.rows[0];
};

/**
 * Count per-class attendance totals from PostgreSQL for reconciliation.
 * Returns rows: { class_id, total_rows, present_rows }
 */
const fetchPerClassCounts = async () => {
  const result = await pool.query(`
    SELECT
      class_id,
      COUNT(*)                                      AS total_rows,
      COUNT(*) FILTER (WHERE status = 'Present')   AS present_rows
    FROM attendance
    GROUP BY class_id
    ORDER BY class_id
  `);
  return result.rows;
};

/**
 * Fetch class dimension data for a given faculty (used by analytics service).
 * Returns: { class_id, subject_id, subject_name, subject_code, section_id,
 *             section_name, semester_id, semester_number, department_id,
 *             faculty_id, academic_year }
 */
const fetchClassesForFaculty = async (facultyId) => {
  const result = await pool.query(
    `SELECT
       c.class_id,
       c.subject_id,
       sub.subject_name,
       sub.subject_code,
       c.section_id,
       sec.section_name,
       c.semester_id,
       sem.semester_number,
       f.department_id,
       c.faculty_id,
       c.academic_year
     FROM classes c
     JOIN subjects  sub ON sub.subject_id  = c.subject_id
     JOIN sections  sec ON sec.section_id  = c.section_id
     JOIN semesters sem ON sem.semester_id  = c.semester_id
     JOIN faculty   f   ON f.faculty_id    = c.faculty_id
     WHERE c.faculty_id = $1
     ORDER BY sub.subject_code, sec.section_name`,
    [facultyId],
  );
  return result.rows;
};

/**
 * Resolve a faculty's employee_id → faculty_id.
 * Returns null if not found.
 */
const resolveFacultyId = async (employeeId) => {
  const result = await pool.query(
    'SELECT faculty_id FROM faculty WHERE employee_id = $1',
    [employeeId],
  );
  return result.rows[0]?.faculty_id ?? null;
};

/**
 * Resolve a department_id from a department_code.
 */
const resolveDepartmentId = async (departmentCode) => {
  const result = await pool.query(
    'SELECT department_id FROM departments WHERE department_code = $1',
    [departmentCode],
  );
  return result.rows[0]?.department_id ?? null;
};

/**
 * Verify that a class is assigned to a given faculty_id (used for HOD scope checks).
 */
const classInDepartment = async (classId, departmentId) => {
  const result = await pool.query(
    `SELECT 1 FROM classes c
     JOIN faculty f ON f.faculty_id = c.faculty_id
     WHERE c.class_id = $1 AND f.department_id = $2`,
    [classId, departmentId],
  );
  return result.rowCount > 0;
};

module.exports = {
  fetchAllAttendanceFact,
  fetchAttendanceCounts,
  fetchPerClassCounts,
  fetchClassesForFaculty,
  resolveFacultyId,
  resolveDepartmentId,
  classInDepartment,
};

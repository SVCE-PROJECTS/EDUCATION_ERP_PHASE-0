const { pool } = require('../config/db');

/**
 * attendance/ia-marks/assignments routes are reached with nothing more than
 * `authenticate` — any signed-in faculty could read or write any other
 * faculty's class data just by knowing (or guessing) a class_id. This checks
 * that `classId` is actually taught by the given employee_id (classes.faculty_id
 * -> faculty.employee_id) before a controller lets a request through.
 */
const isOwnClass = async (classId, employeeId) => {
  if (!classId || !employeeId) return false;
  const result = await pool.query(
    `SELECT 1 FROM classes c
     JOIN faculty f ON f.faculty_id = c.faculty_id
     WHERE c.class_id = $1 AND f.employee_id = $2`,
    [classId, employeeId],
  );
  return result.rowCount > 0;
};

/**
 * Batched version of isOwnClass: checks that EVERY id in classIds is
 * taught by employeeId, in a single round trip instead of one query per
 * class id (used by bulk-save endpoints).
 */
const ownsAllClasses = async (classIds, employeeId) => {
  const ids = [...new Set(classIds)].filter(Boolean);
  if (!ids.length) return true;
  if (!employeeId) return false;

  const result = await pool.query(
    `SELECT c.class_id FROM classes c
     JOIN faculty f ON f.faculty_id = c.faculty_id
     WHERE c.class_id = ANY($1::bigint[]) AND f.employee_id = $2`,
    [ids, employeeId],
  );
  const ownedIds = new Set(result.rows.map((row) => String(row.class_id)));
  return ids.every((id) => ownedIds.has(String(id)));
};

module.exports = { isOwnClass, ownsAllClasses };

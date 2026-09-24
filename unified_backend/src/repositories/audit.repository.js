const { query } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * Actors come from two different tables with two different id shapes:
 *  - Admin accounts: users.user_id, a BIGINT.
 *  - Faculty/HOD accounts: faculty.employee_id, a string (e.g. "EMP001").
 *
 * audit_logs carries one column per shape — user_id (BIGINT FK) and
 * performed_by_employee_id (VARCHAR FK) — so each actor is stored as a
 * real, joinable reference instead of losing identity or being crammed
 * into the JSON payload.
 */
const isNumericId = (value) => {
  if (value === null || value === undefined || value === '') return false;
  return Number.isInteger(Number(value));
};

/**
 * @param {object} params
 * @param {string|number} [params.userId] - Actor id (numeric users.user_id
 *   or a faculty employee_id string) — whichever the caller has.
 * @param {string} params.action
 * @param {string} params.module
 * @param {string} [params.recordId]
 * @param {object} [params.oldValue]
 * @param {object} [params.newValue]
 * @param {number} [params.departmentId] - Scopes the entry to a department
 *   so a HOD's Activity Log can query it directly.
 */
const create = async ({
  userId, action, module, recordId, oldValue, newValue, departmentId,
}) => {
  try {
    const numericUserId = isNumericId(userId) ? Number(userId) : null;
    const facultyActorId = !isNumericId(userId) && userId ? String(userId) : null;

    const result = await query(
      `INSERT INTO audit_logs
         (user_id, performed_by_employee_id, department_id, action, module, record_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING audit_id`,
      [
        numericUserId,
        facultyActorId,
        departmentId || null,
        action   || null,
        module   || null,
        recordId || null,
        oldValue != null ? JSON.stringify(oldValue) : null,
        newValue != null ? JSON.stringify(newValue) : null,
      ],
    );
    return result.rows[0];
  } catch (error) {
    // Best-effort logging only — never let this fail the caller's request.
    logger.error('Audit log insert failed (ignored):', error);
    return null;
  }
};

const log = async ({
  performedBy, action, facultyId, details, departmentId,
}) => create({
  userId: performedBy || null,
  action,
  module: 'faculty',
  recordId: facultyId || null,
  oldValue: null,
  newValue: details || null,
  departmentId,
});

/**
 * Paginated, filterable read of audit_logs.
 * Joins both possible actor tables so every row resolves to a display name
 * regardless of whether it was an admin or a faculty/HOD action.
 */
const findAll = async ({
  page = 1, pageSize = 25, module: moduleFilter, action, dateFrom, dateTo, departmentId,
} = {}) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (moduleFilter)  { conditions.push(`a.module = $${idx}`); params.push(moduleFilter); idx += 1; }
  if (action)        { conditions.push(`a.action = $${idx}`); params.push(action); idx += 1; }
  if (dateFrom)      { conditions.push(`a.created_at >= $${idx}`); params.push(dateFrom); idx += 1; }
  if (dateTo)        { conditions.push(`a.created_at <= $${idx}`); params.push(dateTo); idx += 1; }
  if (departmentId)  { conditions.push(`a.department_id = $${idx}`); params.push(departmentId); idx += 1; }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const limit = Math.min(Math.max(pageSize, 1), 100);
  const offset = (Math.max(page, 1) - 1) * limit;
  const dataParams = [...params, limit, offset];

  const [countResult, result] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total FROM audit_logs a ${whereClause}`,
      params,
    ),
    query(
      `SELECT
         a.audit_id     AS "id",
         a.action,
         a.module,
         a.record_id    AS "recordId",
         a.old_value    AS "oldValue",
         a.new_value    AS "newValue",
         a.created_at   AS "createdAt",
         a.department_id AS "departmentId",
         COALESCE(u.username, pf.name) AS "performedBy"
       FROM audit_logs a
       LEFT JOIN users   u  ON u.user_id       = a.user_id
       LEFT JOIN faculty pf ON pf.employee_id  = a.performed_by_employee_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams,
    ),
  ]);
  const total = countResult.rows[0]?.total || 0;

  return { rows: result.rows, total };
};

module.exports = {
  create, log, findAll,
};

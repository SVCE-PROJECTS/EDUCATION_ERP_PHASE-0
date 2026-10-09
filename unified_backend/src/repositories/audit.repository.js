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

// ── SELECT fragment shared by findAll and findByActor ──────────────────────
const SELECT_COLS = `
  SELECT
    a.audit_id      AS "id",
    a.action,
    a.module,
    a.record_id     AS "recordId",
    a.old_value     AS "oldValue",
    a.new_value     AS "newValue",
    a.created_at    AS "createdAt",
    a.department_id AS "departmentId",
    COALESCE(u.username, pf.name) AS "performedBy"
  FROM audit_logs a
  LEFT JOIN users   u  ON u.user_id      = a.user_id
  LEFT JOIN faculty pf ON pf.employee_id = a.performed_by_employee_id
`;

/**
 * Insert a single audit log entry.
 * Best-effort — swallows errors so a logging failure never blocks the caller.
 */
const create = async ({
  userId, action, module, recordId, oldValue, newValue, departmentId,
}) => {
  try {
    const numericUserId  = isNumericId(userId) ? Number(userId) : null;
    const facultyActorId = !isNumericId(userId) && userId ? String(userId) : null;

    const result = await query(
      `INSERT INTO audit_logs
         (user_id, performed_by_employee_id, department_id,
          action, module, record_id, old_value, new_value)
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
    logger.error('Audit log insert failed (ignored):', error);
    return null;
  }
};

const log = async ({
  performedBy, action, facultyId, details, departmentId,
}) => create({
  userId:       performedBy || null,
  action,
  module:       'faculty',
  recordId:     facultyId || null,
  oldValue:     null,
  newValue:     details || null,
  departmentId,
});

/**
 * Paginated, filterable read of ALL audit_logs.
 * Used by admin (full view) and HOD (department-scoped via departmentId).
 */
const findAll = async ({
  page = 1, pageSize = 25,
  module: moduleFilter, action, dateFrom, dateTo, departmentId,
} = {}) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (moduleFilter) { conditions.push(`a.module = $${idx++}`);        params.push(moduleFilter); }
  if (action)       { conditions.push(`a.action = $${idx++}`);        params.push(action); }
  if (dateFrom)     { conditions.push(`a.created_at >= $${idx++}`);   params.push(dateFrom); }
  if (dateTo)       { conditions.push(`a.created_at <= $${idx++}`);   params.push(dateTo); }
  if (departmentId) { conditions.push(`a.department_id = $${idx++}`); params.push(departmentId); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM audit_logs a ${whereClause}`, params),
    query(
      `${SELECT_COLS} ${whereClause} ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
  ]);

  return {
    rows:  dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

/**
 * Get all audit log entries performed by a specific actor.
 * Used by GET /api/audit-logs/me — actorId always comes from req.user (JWT).
 */
const findByActor = async ({
  actorId,
  page = 1, pageSize = 25,
  module: moduleFilter, action, dateFrom, dateTo,
} = {}) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  // Faculty actors are stored as VARCHAR employee_id; admins as BIGINT user_id.
  // Handle both so the query works regardless of which column was populated.
  const numId = Number(actorId);
  if (!Number.isNaN(numId) && Number.isInteger(numId) && numId > 0) {
    conditions.push(`(a.user_id = $${idx} OR a.performed_by_employee_id = $${idx + 1})`);
    params.push(numId, String(actorId));
    idx += 2;
  } else {
    conditions.push(`a.performed_by_employee_id = $${idx++}`);
    params.push(String(actorId));
  }

  if (moduleFilter) { conditions.push(`a.module = $${idx++}`);      params.push(moduleFilter); }
  if (action)       { conditions.push(`a.action = $${idx++}`);      params.push(action); }
  if (dateFrom)     { conditions.push(`a.created_at >= $${idx++}`); params.push(dateFrom); }
  if (dateTo)       { conditions.push(`a.created_at <= $${idx++}`); params.push(dateTo); }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const limit  = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM audit_logs a ${whereClause}`, params),
    query(
      `${SELECT_COLS} ${whereClause} ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
  ]);

  return {
    rows:  dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

module.exports = { create, log, findAll, findByActor };

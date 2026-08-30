const { query } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * FIXED: audit_logs.user_id is a BIGINT FK into users(user_id). Faculty/HOD
 * accounts are NOT rows in the `users` table — they authenticate against the
 * `faculty` table, and their JWT's `id` claim is the employee_id STRING
 * (e.g. "EMP001"), not a numeric users.user_id.
 *
 * Previously this repository inserted that raw value straight into the
 * BIGINT column, which threw Postgres error 22P02 ("invalid input syntax
 * for type bigint") every time an HOD created/updated/deleted faculty or
 * synced coordinator roles. That error propagated up and surfaced to the
 * user as "Invalid data format" — even though the actual faculty write had
 * already completed successfully just before the audit-log call blew up.
 *
 * Fix:
 *  1. Only pass a numeric value through to the BIGINT column; anything
 *     else (e.g. an employee_id string) is stored as null there and kept
 *     instead inside `new_value` so the information isn't lost.
 *  2. Audit logging is best-effort: a failure here must never bubble up
 *     and cause an otherwise-successful operation to be reported as
 *     failed. Errors are logged server-side and swallowed.
 */

const toNumericIdOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

const create = async ({ userId, action, module, recordId, oldValue, newValue }) => {
  try {
    const numericUserId = toNumericIdOrNull(userId);

    // If the actor id wasn't numeric (e.g. a faculty employee_id string),
    // keep it visible in new_value instead of silently dropping it.
    const enrichedNewValue =
      numericUserId === null && userId
        ? { ...(newValue || {}), performedByRef: userId }
        : newValue;

    const result = await query(
      `INSERT INTO audit_logs (user_id, action, module, record_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING audit_id`,
      [
        numericUserId,
        action   || null,
        module   || null,
        recordId || null,
        oldValue != null ? JSON.stringify(oldValue) : null,
        enrichedNewValue != null ? JSON.stringify(enrichedNewValue) : null,
      ],
    );
    return result.rows[0];
  } catch (error) {
    // Best-effort logging only — never let this fail the caller's request.
    logger.error('Audit log insert failed (ignored):', error);
    return null;
  }
};

const log = async ({ performedBy, action, facultyId, details }) => {
  return create({
    userId: performedBy || null,
    action,
    module: 'faculty',
    recordId: facultyId || null,
    oldValue: null,
    newValue: details || null,
  });
};

module.exports = { create, log };

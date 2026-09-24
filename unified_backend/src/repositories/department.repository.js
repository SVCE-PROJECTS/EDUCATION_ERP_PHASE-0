const { query } = require('../config/db');

async function findAll() {
  const result = await query(
    `SELECT department_id   AS id,
            department_name AS name,
            department_code AS code,
            is_active       AS "isActive",
            created_at      AS "createdAt"
     FROM departments
     ORDER BY department_name ASC`,
  );
  return result.rows;
}

async function create({ name, code }) {
  const result = await query(
    `INSERT INTO departments (department_name, department_code)
     VALUES ($1, $2)
     RETURNING department_id   AS id,
               department_name AS name,
               department_code AS code,
               is_active       AS "isActive",
               created_at      AS "createdAt"`,
    [name, code],
  );
  return result.rows[0];
}

async function setActive(id, isActive) {
  const result = await query(
    `UPDATE departments SET is_active = $1, updated_at = NOW()
     WHERE department_id = $2
     RETURNING department_id   AS id,
               department_name AS name,
               department_code AS code,
               is_active       AS "isActive",
               created_at      AS "createdAt"`,
    [isActive, id],
  );
  return result.rows[0] || null;
}

module.exports = { findAll, create, setActive };

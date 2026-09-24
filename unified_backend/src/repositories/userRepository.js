const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

/**
 * Find user by username.
 * Aliases unified schema columns to the shape expected by authService.
 */
async function findByUsername(username) {
  const result = await query(
    `SELECT
       u.user_id AS id,
       u.username,
       u.password_hash AS "passwordHash",
       u.username AS "fullName",
       r.role_name AS role,
       (u.status = 'active') AS "isActive"
     FROM users u
     LEFT JOIN roles r ON r.role_id = u.role_id
     WHERE u.username = $1`,
    [username],
  );
  return result.rows[0] || null;
}

/**
 * Find user by user_id.
 */
async function findById(id) {
  const result = await query(
    `SELECT
       u.user_id AS id,
       u.username,
       u.username AS "fullName",
       r.role_name AS role,
       (u.status = 'active') AS "isActive"
     FROM users u
     LEFT JOIN roles r ON r.role_id = u.role_id
     WHERE u.user_id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

/**
 * All rows in `users` — in this schema that's exclusively admin-portal
 * accounts (faculty/HOD authenticate against the separate `faculty` table),
 * so this doubles as "list admin users" for the Admin Users screen.
 */
async function findAllAdmins() {
  const result = await query(
    `SELECT
       u.user_id    AS id,
       u.username,
       u.email,
       u.status,
       u.last_login AS "lastLogin",
       u.created_at AS "createdAt",
       r.role_name  AS "roleName"
     FROM users u
     LEFT JOIN roles r ON r.role_id = u.role_id
     ORDER BY u.created_at DESC`,
  );
  return result.rows;
}

async function findRoleIdByName(roleName) {
  const result = await query('SELECT role_id FROM roles WHERE role_name = $1', [roleName]);
  return result.rows[0]?.role_id || null;
}

async function createAdmin({
  username, email, password, roleName = 'admin',
}) {
  const roleId = await findRoleIdByName(roleName);
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (username, email, password_hash, role_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING user_id AS id, username, email, status, created_at AS "createdAt"`,
    [username, email, passwordHash, roleId],
  );
  return result.rows[0];
}

async function setStatus(id, status) {
  const result = await query(
    `UPDATE users SET status = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING user_id AS id, username, email, status`,
    [status, id],
  );
  return result.rows[0] || null;
}

module.exports = {
  findByUsername, findById, findAllAdmins, createAdmin, setStatus,
};

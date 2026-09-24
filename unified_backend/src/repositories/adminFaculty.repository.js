'use strict';
/**
 * Admin Faculty Repository
 * Cross-department faculty queries for admin portal use.
 * The existing faculty.repository.js is department-scoped (HOD portal).
 * This module provides unrestricted admin-level access.
 */

const { query } = require('../config/db');

function normalizeRow(row) {
  if (!row) return null;
  return {
    id:              row.faculty_id,
    facultyId:       row.faculty_id,
    employeeId:      row.employee_id,
    name:            row.name,
    email:           row.email,
    phone:           row.phone || null,
    designation:     row.designation,
    qualification:   row.qualification || null,
    specialization:  row.specialization || null,
    experienceYears: row.experience_years ?? 0,
    departmentId:    row.department_id,
    departmentName:  row.department_name || null,
    photoUrl:        row.photo_url || null,
    username:        row.username,
    isHod:           row.is_hod ?? false,
    status:          row.status,
    joiningDate:     row.joining_date ? row.joining_date.toISOString().split('T')[0] : null,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

const findAll = async ({ page = 1, pageSize = 20, search, departmentId, status } = {}) => {
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(
      `(f.name ILIKE $${idx} OR f.employee_id ILIKE $${idx} OR f.email ILIKE $${idx} OR f.designation ILIKE $${idx})`,
    );
    params.push(`%${search}%`);
    idx++;
  }
  if (departmentId) {
    conditions.push(`f.department_id = $${idx}`);
    params.push(departmentId);
    idx++;
  }
  if (status) {
    conditions.push(`f.status = $${idx}`);
    params.push(status);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [data, count] = await Promise.all([
    query(
      `SELECT f.*, d.department_name
       FROM faculty f
       LEFT JOIN departments d ON d.department_id = f.department_id
       ${where}
       ORDER BY f.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM faculty f
       ${where}`,
      params,
    ),
  ]);

  return {
    data:  data.rows.map(normalizeRow),
    total: count.rows[0].total,
  };
};

const findById = async (facultyId) => {
  const result = await query(
    `SELECT f.*, d.department_name
     FROM faculty f
     LEFT JOIN departments d ON d.department_id = f.department_id
     WHERE f.faculty_id = $1`,
    [facultyId],
  );
  return normalizeRow(result.rows[0] || null);
};

const create = async (data) => {
  const result = await query(
    `INSERT INTO faculty
       (employee_id, name, email, phone, designation, qualification,
        specialization, experience_years, department_id, photo_url,
        username, password_hash, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING faculty_id`,
    [
      data.employeeId,
      data.name,
      data.email,
      data.phone        || null,
      data.designation,
      data.qualification || null,
      data.specialization || null,
      parseInt(data.experienceYears) || 0,
      data.departmentId,
      data.photoUrl     || null,
      data.username,
      data.passwordHash,
      data.status       || 'ACTIVE',
    ],
  );
  return findById(result.rows[0].faculty_id);
};

const update = async (facultyId, data) => {
  const fieldMap = {
    name:            'name',
    email:           'email',
    phone:           'phone',
    designation:     'designation',
    qualification:   'qualification',
    specialization:  'specialization',
    experienceYears: 'experience_years',
    departmentId:    'department_id',
    photoUrl:        'photo_url',
    status:          'status',
    passwordHash:    'password_hash',
  };

  const fields = [];
  const params = [];
  let idx = 1;

  Object.entries(fieldMap).forEach(([key, col]) => {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${idx}`);
      params.push(data[key]);
      idx++;
    }
  });

  if (!fields.length) return findById(facultyId);

  fields.push(`updated_at = NOW()`);
  params.push(facultyId);

  await query(
    `UPDATE faculty SET ${fields.join(', ')} WHERE faculty_id = $${idx}`,
    params,
  );
  return findById(facultyId);
};

const remove = async (facultyId) => {
  const result = await query(
    'DELETE FROM faculty WHERE faculty_id = $1 RETURNING faculty_id',
    [facultyId],
  );
  return result.rowCount > 0;
};

const checkUnique = async ({ employeeId, email, username }, excludeId = null) => {
  const orClauses = [];
  const params = [];
  let idx = 1;

  if (employeeId) { orClauses.push(`employee_id = $${idx}`); params.push(employeeId); idx++; }
  if (email)      { orClauses.push(`email = $${idx}`);       params.push(email);      idx++; }
  if (username)   { orClauses.push(`username = $${idx}`);    params.push(username);   idx++; }

  if (!orClauses.length) return null;

  let sql = `SELECT faculty_id, employee_id, email, username FROM faculty WHERE (${orClauses.join(' OR ')})`;
  if (excludeId) { sql += ` AND faculty_id <> $${idx}`; params.push(excludeId); }
  sql += ' LIMIT 1';

  const result = await query(sql, params);
  return result.rows[0] || null;
};

module.exports = { findAll, findById, create, update, remove, checkUnique };

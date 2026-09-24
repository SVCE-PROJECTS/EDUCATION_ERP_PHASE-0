'use strict';
/**
 * Non-Teaching Staff Repository
 * CRUD for the non_teaching_staff table.
 * Uses staff_dept_id (FK → staff_departments) for department, NOT the academic departments table.
 */

const { query } = require('../config/db');

function normalizeRow(row) {
  if (!row) return null;
  return {
    id:             row.staff_id,
    staffId:        row.staff_id,
    employeeId:     row.employee_id,
    name:           row.name,
    email:          row.email        || null,
    phone:          row.phone        || null,
    gender:         row.gender       || null,
    designation:    row.designation,
    departmentId:   row.staff_dept_id || null,   // maps to staff_departments
    departmentName: row.staff_dept_name || null,
    qualification:  row.qualification || null,
    joiningDate:    row.joining_date ? row.joining_date.toISOString().split('T')[0] : null,
    status:         row.status,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

const findAll = async ({ page = 1, pageSize = 20, search, departmentId, status } = {}) => {
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(
      `(s.name ILIKE $${idx} OR s.employee_id ILIKE $${idx} OR s.email ILIKE $${idx} OR s.designation ILIKE $${idx})`,
    );
    params.push(`%${search}%`);
    idx++;
  }
  if (departmentId) {
    conditions.push(`s.staff_dept_id = $${idx}`);
    params.push(departmentId);
    idx++;
  }
  if (status) {
    conditions.push(`s.status = $${idx}`);
    params.push(status);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [data, count] = await Promise.all([
    query(
      `SELECT s.*, sd.name AS staff_dept_name
       FROM non_teaching_staff s
       LEFT JOIN staff_departments sd ON sd.staff_dept_id = s.staff_dept_id
       ${where}
       ORDER BY s.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM non_teaching_staff s ${where}`,
      params,
    ),
  ]);

  return {
    data:  data.rows.map(normalizeRow),
    total: count.rows[0].total,
  };
};

const findById = async (staffId) => {
  const result = await query(
    `SELECT s.*, sd.name AS staff_dept_name
     FROM non_teaching_staff s
     LEFT JOIN staff_departments sd ON sd.staff_dept_id = s.staff_dept_id
     WHERE s.staff_id = $1`,
    [staffId],
  );
  return normalizeRow(result.rows[0] || null);
};

const create = async (data) => {
  const result = await query(
    `INSERT INTO non_teaching_staff
       (employee_id, name, email, phone, gender, designation,
        staff_dept_id, qualification, joining_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING staff_id`,
    [
      data.employeeId,
      data.name,
      data.email        || null,
      data.phone        || null,
      data.gender       || null,
      data.designation,
      data.departmentId || null,
      data.qualification || null,
      data.joiningDate  || null,
      data.status       || 'ACTIVE',
    ],
  );
  return findById(result.rows[0].staff_id);
};

const update = async (staffId, data) => {
  const fieldMap = {
    name:          'name',
    email:         'email',
    phone:         'phone',
    gender:        'gender',
    designation:   'designation',
    departmentId:  'staff_dept_id',
    qualification: 'qualification',
    joiningDate:   'joining_date',
    status:        'status',
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

  if (!fields.length) return findById(staffId);

  fields.push(`updated_at = NOW()`);
  params.push(staffId);

  await query(
    `UPDATE non_teaching_staff SET ${fields.join(', ')} WHERE staff_id = $${idx}`,
    params,
  );
  return findById(staffId);
};

const remove = async (staffId) => {
  const result = await query(
    'DELETE FROM non_teaching_staff WHERE staff_id = $1 RETURNING staff_id',
    [staffId],
  );
  return result.rowCount > 0;
};

const checkUnique = async ({ employeeId, email }, excludeId = null) => {
  const orClauses = [];
  const params = [];
  let idx = 1;

  if (employeeId) { orClauses.push(`employee_id = $${idx}`); params.push(employeeId); idx++; }
  if (email)      { orClauses.push(`email = $${idx}`);       params.push(email);      idx++; }

  if (!orClauses.length) return null;

  let sql = `SELECT staff_id, employee_id, email FROM non_teaching_staff WHERE (${orClauses.join(' OR ')})`;
  if (excludeId) { sql += ` AND staff_id <> $${idx}`; params.push(excludeId); }
  sql += ' LIMIT 1';

  const result = await query(sql, params);
  return result.rows[0] || null;
};

module.exports = { findAll, findById, create, update, remove, checkUnique };

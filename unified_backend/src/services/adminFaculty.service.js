'use strict';
const bcrypt = require('bcryptjs');
const repo   = require('../repositories/adminFaculty.repository');

const sanitize = (f) => {
  if (!f) return null;
  const { passwordHash, ...safe } = f;
  return safe;
};

const list = async ({ page, pageSize, search, departmentId, status }) => {
  const { data, total } = await repo.findAll({ page, pageSize, search, departmentId, status });
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const getById = async (id) => {
  const faculty = await repo.findById(id);
  if (!faculty) throw { statusCode: 404, message: 'Faculty not found.' };
  return sanitize(faculty);
};

const create = async (data) => {
  const conflict = await repo.checkUnique({
    employeeId: data.employeeId,
    email:      data.email,
    username:   data.username,
  });
  if (conflict) {
    const field = conflict.employee_id === data.employeeId ? 'Employee ID'
                : conflict.email       === data.email      ? 'Email'
                : 'Username';
    throw { statusCode: 409, message: `${field} already exists.` };
  }

  if (!data.password) throw { statusCode: 400, message: 'Password is required.' };
  // Kept in sync with adminUsers.controller.js's password rule — this is the
  // only server-side length check on faculty passwords (the pre-existing
  // facultyValidator.js min-6 rule isn't wired into this admin route), so
  // without it any length would be accepted regardless of what the frontend
  // form enforces.
  if (data.password.length < 8) {
    throw { statusCode: 400, message: 'Password must be at least 8 characters.' };
  }
  const passwordHash = await bcrypt.hash(data.password, 12);

  const faculty = await repo.create({ ...data, passwordHash });
  return sanitize(faculty);
};

const update = async (id, data) => {
  const existing = await repo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Faculty not found.' };

  if (data.email || data.employeeId) {
    const conflict = await repo.checkUnique(
      { employeeId: data.employeeId, email: data.email },
      id,
    );
    if (conflict) {
      const field = conflict.employee_id === data.employeeId ? 'Employee ID' : 'Email';
      throw { statusCode: 409, message: `${field} already exists.` };
    }
  }

  let passwordHash;
  if (data.password) {
    if (data.password.length < 8) {
      throw { statusCode: 400, message: 'Password must be at least 8 characters.' };
    }
    passwordHash = await bcrypt.hash(data.password, 12);
  }

  const updated = await repo.update(id, { ...data, ...(passwordHash ? { passwordHash } : {}) });
  return sanitize(updated);
};

const remove = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Faculty not found.' };
  await repo.remove(id);
  return { message: 'Faculty deleted successfully.' };
};

module.exports = { list, getById, create, update, remove };

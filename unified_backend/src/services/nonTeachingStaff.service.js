'use strict';
const repo = require('../repositories/nonTeachingStaff.repository');

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
  const staff = await repo.findById(id);
  if (!staff) throw { statusCode: 404, message: 'Staff member not found.' };
  return staff;
};

const create = async (data) => {
  if (data.employeeId || data.email) {
    const conflict = await repo.checkUnique({
      employeeId: data.employeeId,
      email:      data.email,
    });
    if (conflict) {
      const field = conflict.employee_id === data.employeeId ? 'Employee ID' : 'Email';
      throw { statusCode: 409, message: `${field} already exists.` };
    }
  }
  return repo.create(data);
};

const update = async (id, data) => {
  const existing = await repo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Staff member not found.' };

  if (data.employeeId || data.email) {
    const conflict = await repo.checkUnique(
      { employeeId: data.employeeId, email: data.email },
      id,
    );
    if (conflict) {
      const field = conflict.employee_id === data.employeeId ? 'Employee ID' : 'Email';
      throw { statusCode: 409, message: `${field} already exists.` };
    }
  }

  return repo.update(id, data);
};

const remove = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Staff member not found.' };
  await repo.remove(id);
  return { message: 'Staff member deleted successfully.' };
};

module.exports = { list, getById, create, update, remove };

const studentRepository = require('../repositories/studentRepository');
const auditRepository = require('../repositories/audit.repository');
const { ApiError } = require('../utils/apiResponse');

async function listStudents(filters) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const { rows, total } = await studentRepository.findAll({ ...filters, page, pageSize });
  return {
    students: rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getStudent(id) {
  const student = await studentRepository.findById(id);
  if (!student) throw new ApiError(404, 'Student not found');
  return student;
}

async function createStudent(payload, performedBy) {
  const student = await studentRepository.create(payload);
  await auditRepository.create({
    userId: performedBy,
    action: 'STUDENT_CREATED',
    module: 'student',
    recordId: student.id,
    newValue: student,
  });
  return student;
}

async function updateStudent(id, payload, performedBy) {
  const existing = await studentRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Student not found');
  const updated = await studentRepository.update(id, payload);
  await auditRepository.create({
    userId: performedBy,
    action: 'STUDENT_UPDATED',
    module: 'student',
    recordId: id,
    oldValue: existing,
    newValue: updated,
  });
  return updated;
}

async function deleteStudent(id, performedBy) {
  const existing = await studentRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Student not found');
  await studentRepository.remove(id);
  await auditRepository.create({
    userId: performedBy,
    action: 'STUDENT_DELETED',
    module: 'student',
    recordId: id,
    oldValue: existing,
  });
}

module.exports = {
  listStudents, getStudent, createStudent, updateStudent, deleteStudent,
};

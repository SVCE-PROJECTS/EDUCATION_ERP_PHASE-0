/**
 * Other Curricular Activity Service
 * Unified schema: activities activity_type='OtherCurricular'
 * title = eventName, description = {organizingCollege, achievement, year, section, semester}
 */

const otherCurricularRepo = require('../repositories/otherCurricular.repository');
const studentRepo = require('../repositories/studentRepository');
const { logActivity } = require('./activityAudit.helper');

const parseQuery = (q) => ({
  page:      Math.max(1, parseInt(q.page)  || 1),
  limit:     Math.min(100, parseInt(q.limit) || 10),
  search:    q.search?.trim() || null,
  sortBy:    q.sortBy    || 'created_at',
  sortOrder: q.sortOrder || 'desc',
});

const getList = async (departmentCode, queryParams) => {
  const params = parseQuery(queryParams);
  const { items, total } = await otherCurricularRepo.findAll(departmentCode, params);
  return {
    items,
    pagination: {
      total,
      page:       params.page,
      limit:      params.limit,
      totalPages: Math.ceil(total / params.limit),
      hasNext:    params.page * params.limit < total,
      hasPrev:    params.page > 1,
    },
  };
};

const getById = async (id, departmentCode) => {
  const record = await otherCurricularRepo.findById(id);
  if (!record) throw { statusCode: 404, message: 'Activity not found.' };
  if (departmentCode && record.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  return record;
};

const create = async (data, departmentCode, performedBy) => {
  if (!data.student_id) throw { statusCode: 400, message: 'Student USN is required.' };
  // FIXED: this field now takes the student's USN (the identifier actually
  // visible in the Student Management screen) instead of the raw internal
  // library_id, which was never shown anywhere in the app.
  const student = await studentRepo.findByUsn(String(data.student_id).trim());
  if (!student) throw { statusCode: 404, message: `No student found with USN "${data.student_id}". Please check and try again.` };
  if (departmentCode && student.department_code !== departmentCode)
    throw { statusCode: 404, message: `No student found with USN "${data.student_id}" in your department.` };
  if (!data.eventName)  throw { statusCode: 400, message: 'eventName is required.' };

  const record = await otherCurricularRepo.create({
    studentId:   student.library_id,
    facultyId:   data.faculty_id || null,
    title:       data.eventName.trim(),
    description: JSON.stringify({
      organizingCollege: data.organizingCollege || null,
      achievement:       data.achievement       || null,
      year:              data.year              || null,
      section:           student.section_name           || null,
      semester:          student.semester_number          || null,
    }),
    academicYear: data.academicYear || (data.year ? String(data.year) : null),
    status:       'Completed',
  });

  await logActivity({
    performedBy, departmentCode,
    action: 'CREATE_OTHER_CURRICULAR', module: 'other_curricular', recordId: record.id,
    details: { title: record.title, studentUsn: student.usn },
  });

  return record;
};

const update = async (id, data, departmentCode, performedBy) => {
  const existing = await otherCurricularRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Activity not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const updateData = {};
  if (data.eventName)    updateData.title       = data.eventName.trim();
  if (data.academicYear) updateData.academicYear = data.academicYear;

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  if (data.organizingCollege !== undefined) desc.organizingCollege = data.organizingCollege;
  if (data.achievement       !== undefined) desc.achievement       = data.achievement;
  if (data.year              !== undefined) desc.year              = parseInt(data.year);
  updateData.description = JSON.stringify(desc);

  const record = await otherCurricularRepo.update(id, updateData);

  await logActivity({
    performedBy, departmentCode,
    action: 'UPDATE_OTHER_CURRICULAR', module: 'other_curricular', recordId: id,
    details: { title: record.title, updatedFields: Object.keys(updateData) },
  });

  return record;
};

const remove = async (id, departmentCode, performedBy) => {
  const existing = await otherCurricularRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Activity not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await otherCurricularRepo.remove(id);

  await logActivity({
    performedBy, departmentCode,
    action: 'DELETE_OTHER_CURRICULAR', module: 'other_curricular', recordId: id,
    details: { title: existing.title, studentUsn: existing.usn },
  });

  return { message: 'Activity deleted successfully.' };
};

module.exports = { getList, getById, create, update, remove };

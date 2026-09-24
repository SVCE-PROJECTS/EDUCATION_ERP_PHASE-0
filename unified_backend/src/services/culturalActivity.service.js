/**
 * Cultural Activity Service
 * Unified schema: activities(activity_id, student_id, faculty_id,
 *   activity_type='Cultural', title, description JSON, academic_year, status)
 */

const culturalActivityRepo = require('../repositories/culturalActivity.repository');
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
  const { items, total } = await culturalActivityRepo.findAll(departmentCode, params);
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
  const record = await culturalActivityRepo.findById(id);
  if (!record) throw { statusCode: 404, message: 'Cultural activity not found.' };
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
  if (!data.culturalActivityName) throw { statusCode: 400, message: 'culturalActivityName is required.' };

  const record = await culturalActivityRepo.create({
    studentId:   student.library_id,
    facultyId:   data.faculty_id || null,
    title:       data.culturalActivityName.trim(),
    description: JSON.stringify({
      eventName:     data.eventName     || null,
      positionPrize: data.positionPrize || null,
      section:          student.section_name      || null,
      semester:         student.semester_number    || null,
    }),
    academicYear: data.academicYear || null,
    status:       'Completed',
  });

  await logActivity({
    performedBy, departmentCode,
    action: 'CREATE_CULTURAL_ACTIVITY', module: 'cultural_activity', recordId: record.id,
    details: { title: record.title, studentUsn: student.usn },
  });

  return record;
};

const update = async (id, data, departmentCode, performedBy) => {
  const existing = await culturalActivityRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Cultural activity not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const updateData = {};
  if (data.culturalActivityName) updateData.title       = data.culturalActivityName.trim();
  if (data.academicYear)         updateData.academicYear = data.academicYear;

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  if (data.eventName     !== undefined) desc.eventName     = data.eventName;
  if (data.positionPrize !== undefined) desc.positionPrize = data.positionPrize;
  if (data.section       !== undefined) desc.section       = data.section;
  if (data.semester      !== undefined) desc.semester      = parseInt(data.semester);
  updateData.description = JSON.stringify(desc);

  const record = await culturalActivityRepo.update(id, updateData);

  await logActivity({
    performedBy, departmentCode,
    action: 'UPDATE_CULTURAL_ACTIVITY', module: 'cultural_activity', recordId: id,
    details: { title: record.title, updatedFields: Object.keys(updateData) },
  });

  return record;
};

const remove = async (id, departmentCode, performedBy) => {
  const existing = await culturalActivityRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Cultural activity not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await culturalActivityRepo.remove(id);

  await logActivity({
    performedBy, departmentCode,
    action: 'DELETE_CULTURAL_ACTIVITY', module: 'cultural_activity', recordId: id,
    details: { title: existing.title, studentUsn: existing.usn },
  });

  return { message: 'Cultural activity deleted successfully.' };
};

module.exports = { getList, getById, create, update, remove };

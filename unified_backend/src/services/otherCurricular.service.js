/**
 * Other Curricular Activity Service
 * Unified schema: activities activity_type='OtherCurricular'
 * title = eventName, description = {organizingCollege, achievement, year, section, semester}
 */

const otherCurricularRepo = require('../repositories/otherCurricular.repository');
const studentRepo = require('../repositories/studentRepository');

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

const create = async (data, departmentCode) => {
  if (!data.student_id) throw { statusCode: 400, message: 'Student USN is required.' };
  // FIXED: this field now takes the student's USN (the identifier actually
  // visible in the Student Management screen) instead of the raw internal
  // library_id, which was never shown anywhere in the app.
  const student = await studentRepo.findByUsn(String(data.student_id).trim());
  if (!student) throw { statusCode: 404, message: `No student found with USN "${data.student_id}". Please check and try again.` };
  if (!data.eventName)  throw { statusCode: 400, message: 'eventName is required.' };

  return otherCurricularRepo.create({
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
};

const update = async (id, data, departmentCode) => {
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

  return otherCurricularRepo.update(id, updateData);
};

const remove = async (id, departmentCode) => {
  const existing = await otherCurricularRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Activity not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await otherCurricularRepo.remove(id);
  return { message: 'Activity deleted successfully.' };
};

module.exports = { getList, getById, create, update, remove };

/**
 * Technical Event Service
 * Unified schema: activities activity_type='Technical'
 * title = projectName, description = {eventType, projectDomain, facultyMentor, projectStatus, section, semester}
 */

const technicalEventRepo = require('../repositories/technicalEvent.repository');
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
  const { items, total } = await technicalEventRepo.findAll(departmentCode, params);
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
  const record = await technicalEventRepo.findById(id);
  if (!record) throw { statusCode: 404, message: 'Technical event not found.' };
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
  if (!data.projectName) throw { statusCode: 400, message: 'projectName is required.' };

  return technicalEventRepo.create({
    studentId:   student.library_id,
    facultyId:   data.faculty_id || null,
    title:       data.projectName.trim(),
    description: JSON.stringify({
      eventType:     data.eventType     || null,
      projectDomain: data.projectDomain || null,
      facultyMentor: data.facultyMentor || null,
      projectStatus: data.projectStatus || 'ONGOING',
      section:       student.section_name       || null,
      semester:      student.semester_number      || null,
    }),
    academicYear: data.academicYear || null,
    // FIXED: same copy-paste bug as Industry Projects had — this ternary
    // returned 'Completed' on both branches regardless of projectStatus.
    status:       data.projectStatus === 'ONGOING' ? 'Ongoing' : 'Completed',
  });
};

const update = async (id, data, departmentCode) => {
  const existing = await technicalEventRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Technical event not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const updateData = {};
  if (data.projectName)  updateData.title       = data.projectName.trim();
  if (data.academicYear) updateData.academicYear = data.academicYear;
  if (data.projectStatus !== undefined)
    updateData.status = data.projectStatus === 'ONGOING' ? 'Ongoing' : 'Completed';

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  if (data.eventType     !== undefined) desc.eventType     = data.eventType;
  if (data.projectDomain !== undefined) desc.projectDomain = data.projectDomain;
  if (data.facultyMentor !== undefined) desc.facultyMentor = data.facultyMentor;
  if (data.projectStatus !== undefined) desc.projectStatus = data.projectStatus;
  updateData.description = JSON.stringify(desc);

  return technicalEventRepo.update(id, updateData);
};

const remove = async (id, departmentCode) => {
  const existing = await technicalEventRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Technical event not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await technicalEventRepo.remove(id);
  return { message: 'Technical event deleted successfully.' };
};

module.exports = { getList, getById, create, update, remove };

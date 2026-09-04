/**
 * Industry Project Service
 * Unified schema: activities activity_type='IndustryProject'
 * title = projectName, description = {status, students: [{student_id, studentName, usn, semester, section}]}
 */

const industryProjectRepo = require('../repositories/industryProject.repository');
const studentRepo = require('../repositories/studentRepository');

// FIXED: previously `status: data.status === 'COMPLETED' ? 'Completed' : 'Completed'`
// returned 'Completed' on both branches of the ternary — a copy-paste bug that made
// every project's status column always end up as "Completed" regardless of what was
// actually selected in the form.
const STATUS_LABELS = { ONGOING: 'Ongoing', COMPLETED: 'Completed', PAUSED: 'Paused' };
const toStatusLabel = (status) => STATUS_LABELS[String(status || '').toUpperCase()] || 'Ongoing';

const parseQuery = (q) => ({
  page:      Math.max(1, parseInt(q.page)  || 1),
  limit:     Math.min(100, parseInt(q.limit) || 10),
  search:    q.search?.trim() || null,
  sortBy:    q.sortBy    || 'created_at',
  sortOrder: q.sortOrder || 'desc',
});

const getList = async (departmentCode, queryParams) => {
  const params = parseQuery(queryParams);
  const { items, total } = await industryProjectRepo.findAll(departmentCode, params);
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
  const record = await industryProjectRepo.findById(id);
  if (!record) throw { statusCode: 404, message: 'Industry project not found.' };
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

  // FIXED: previously wrapped every student in a `students` JSON array inside a
  // single `activities` row, which gave "extra" students no real database identity
  // — they couldn't be independently edited or deleted. Now each student is their
  // own `activities` row (exactly like Sports/Cultural/etc), sharing the same
  // title + academic year so the app's existing grouping logic displays them
  // together on one project card. Adding another student to this project just
  // means creating another row with the same Project Title + Academic Year;
  // each row (= each student) can then be edited/deleted independently.
  return industryProjectRepo.create({
    studentId:   student.library_id,
    facultyId:   data.faculty_id || null,
    title:       data.projectName.trim(),
    description: JSON.stringify({
      projectStatus: data.status || 'ONGOING',
      domain:   data.domain   || null,
      section:          student.section_name      || null,
      semester:         student.semester_number    || null,
    }),
    academicYear: data.academicYear || null,
    status:       toStatusLabel(data.status),
  });
};

const update = async (id, data, departmentCode) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const updateData = {};
  if (data.projectName)  updateData.title       = data.projectName.trim();
  if (data.academicYear) updateData.academicYear = data.academicYear;
  // FIXED: status edits previously only ever touched the JSON `description`
  // field (desc.projectStatus below) — the actual `activities.status` column
  // was never updated, so it stayed stuck at whatever was written on create.
  if (data.status !== undefined) updateData.status = toStatusLabel(data.status);

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  if (data.status   !== undefined) desc.projectStatus = data.status;
  if (data.domain   !== undefined) desc.domain        = data.domain;
  if (data.semester !== undefined) desc.semester      = data.semester;
  if (data.section  !== undefined) desc.section       = data.section;
  updateData.description = JSON.stringify(desc);

  return industryProjectRepo.update(id, updateData);
};

const remove = async (id, departmentCode) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await industryProjectRepo.remove(id);
  return { message: 'Industry project deleted successfully.' };
};

const addStudent = async (id, studentData, departmentCode) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  const students = desc.students || [];

  if (students.some(s => s.library_id === studentData.student_id)) {
    throw { statusCode: 409, message: 'Student already in this project.' };
  }

  students.push({
    library_id:  studentData.student_id,
    studentName: studentData.studentName || null,
    usn:         studentData.usn         || null,
    semester:    studentData.semester    || null,
    section:     studentData.section     || null,
  });
  desc.students = students;

  return industryProjectRepo.update(id, { description: JSON.stringify(desc) });
};

const removeStudent = async (id, studentId, departmentCode) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  const before = (desc.students || []).length;
  desc.students = (desc.students || []).filter(s => s.library_id !== studentId);
  if (desc.students.length === before) throw { statusCode: 404, message: 'Student not found in project.' };

  return industryProjectRepo.update(id, { description: JSON.stringify(desc) });
};

module.exports = { getList, getById, create, update, remove, addStudent, removeStudent };

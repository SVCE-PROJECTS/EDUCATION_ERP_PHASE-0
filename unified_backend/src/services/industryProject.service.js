/**
 * Industry Project Service
 * Unified schema: activities activity_type='IndustryProject'
 * title = projectName, description = {status, students: [{student_id, studentName, usn, semester, section}]}
 */

const industryProjectRepo = require('../repositories/industryProject.repository');
const studentRepo = require('../repositories/studentRepository');
const { logActivity } = require('./activityAudit.helper');

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

const create = async (data, departmentCode, performedBy) => {
  if (!data.student_id) throw { statusCode: 400, message: 'Student USN is required.' };
  // FIXED: this field now takes the student's USN (the identifier actually
  // visible in the Student Management screen) instead of the raw internal
  // library_id, which was never shown anywhere in the app.
  const student = await studentRepo.findByUsn(String(data.student_id).trim());
  if (!student) throw { statusCode: 404, message: `No student found with USN "${data.student_id}". Please check and try again.` };
  // Student exists but belongs to another department — treat identically to
  // "not found" so a project can't silently be created for a student who'll
  // never show up in this department's list (findAll filters by department).
  if (departmentCode && student.department_code !== departmentCode)
    throw { statusCode: 404, message: `No student found with USN "${data.student_id}" in your department.` };
  if (!data.projectName) throw { statusCode: 400, message: 'projectName is required.' };

  // FIXED: previously wrapped every student in a `students` JSON array inside a
  // single `activities` row, which gave "extra" students no real database identity
  // — they couldn't be independently edited or deleted. Now each student is their
  // own `activities` row (exactly like Sports/Cultural/etc), sharing the same
  // title + academic year so the app's existing grouping logic displays them
  // together on one project card. Adding another student to this project just
  // means creating another row with the same Project Title + Academic Year;
  // each row (= each student) can then be edited/deleted independently.
  const record = await industryProjectRepo.create({
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

  await logActivity({
    performedBy, departmentCode,
    action: 'CREATE_INDUSTRY_PROJECT', module: 'industry_project', recordId: record.id,
    details: { title: record.title, studentUsn: student.usn },
  });

  return record;
};

const update = async (id, data, departmentCode, performedBy) => {
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

  const record = await industryProjectRepo.update(id, updateData);

  await logActivity({
    performedBy, departmentCode,
    action: 'UPDATE_INDUSTRY_PROJECT', module: 'industry_project', recordId: id,
    details: { title: record.title, updatedFields: Object.keys(updateData) },
  });

  return record;
};

const remove = async (id, departmentCode, performedBy) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await industryProjectRepo.remove(id);

  await logActivity({
    performedBy, departmentCode,
    action: 'DELETE_INDUSTRY_PROJECT', module: 'industry_project', recordId: id,
    details: { title: existing.title, studentUsn: existing.usn },
  });

  return { message: 'Industry project deleted successfully.' };
};

// Students are added/removed as their own `activities` rows (see the
// FIXED note on `create` above) via industryProjectRepo.addStudent/
// removeStudent, NOT by mutating a legacy `description.students` JSON
// array — a row-per-student is what findAll/findById actually join and
// filter on, so writing only to the JSON blob left added students
// invisible to search/listing.
const addStudent = async (id, studentData, departmentCode, performedBy) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  if (!studentData.student_id) throw { statusCode: 400, message: 'Student USN is required.' };
  const student = await studentRepo.findByUsn(String(studentData.student_id).trim());
  if (!student) throw { statusCode: 404, message: `No student found with USN "${studentData.student_id}". Please check and try again.` };
  if (departmentCode && student.department_code !== departmentCode)
    throw { statusCode: 404, message: `No student found with USN "${studentData.student_id}" in your department.` };

  const dup = await industryProjectRepo.findByStudentInProject(
    existing.title, existing.academic_year, student.library_id,
  );
  if (dup) throw { statusCode: 409, message: 'Student already in this project.' };

  const record = await industryProjectRepo.addStudent(id, {
    studentId:    student.library_id,
    facultyId:    existing.faculty_id,
    title:        existing.title,
    description:  JSON.stringify({
      projectStatus: existing.status,
      section:  studentData.section  || student.section_name   || null,
      semester: studentData.semester || student.semester_number || null,
    }),
    academicYear: existing.academic_year,
    status:       existing.status,
  });

  await logActivity({
    performedBy, departmentCode,
    action: 'ADD_PROJECT_STUDENT', module: 'industry_project', recordId: id,
    details: { title: existing.title, studentUsn: student.usn },
  });

  return record;
};

const removeStudent = async (id, studentId, departmentCode, performedBy) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const target = await industryProjectRepo.findByStudentInProject(
    existing.title, existing.academic_year, studentId,
  );
  if (!target) throw { statusCode: 404, message: 'Student not found in project.' };

  await industryProjectRepo.removeStudent(target.id);

  await logActivity({
    performedBy, departmentCode,
    action: 'REMOVE_PROJECT_STUDENT', module: 'industry_project', recordId: id,
    details: { title: existing.title, studentId },
  });

  return { message: 'Student removed from project successfully.' };
};

module.exports = { getList, getById, create, update, remove, addStudent, removeStudent };

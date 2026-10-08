/**
 * Industry Project Service
 * Unified schema: activities activity_type='IndustryProject'
 *
 * Data model:
 *   A "project" is a group of activities rows sharing the same title +
 *   academic_year. There is one header row (student_id IS NULL) created when
 *   the HOD first creates the project, then one row per student added via
 *   POST /:id/students.
 *
 *   Legacy rows (before the header concept existed) have student_id set and
 *   no header row — they work fine because the frontend groups by title +
 *   academic_year regardless.
 */

const industryProjectRepo = require('../repositories/industryProject.repository');
const studentRepo = require('../repositories/studentRepository');
const { logActivity } = require('./activityAudit.helper');

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

/**
 * Create a new project (header row, no student required).
 * The HOD adds students separately via POST /:id/students.
 */
const create = async (data, departmentCode, performedBy) => {
  if (!data.projectName) throw { statusCode: 400, message: 'projectName is required.' };

  // Look up the HOD's faculty_id from their employee_id
  const facultyRepo = require('../repositories/faculty.repository');
  let facultyId = null;
  if (performedBy) {
    const faculty = await facultyRepo.findByEmployeeId(performedBy);
    if (faculty) facultyId = faculty.faculty_id;
  }

  // Build description JSON — no student data here, just project metadata.
  const description = JSON.stringify({
    projectStatus: data.status || 'ONGOING',
    domain:        data.domain || null,
  });

  // faculty_id: use the performing HOD's linked faculty record when available.
  const record = await industryProjectRepo.create({
    studentId:    null,           // header row — no student yet
    facultyId:    facultyId,
    title:        data.projectName.trim(),
    description,
    academicYear: data.academicYear || null,
    status:       toStatusLabel(data.status),
  });

  await logActivity({
    performedBy, departmentCode,
    action: 'CREATE_INDUSTRY_PROJECT', module: 'industry_project', recordId: record.id,
    details: { title: record.title },
  });

  return record;
};

const update = async (id, data, departmentCode, performedBy) => {
  const existing = await industryProjectRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Industry project not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const updateData = {};
  if (data.projectName !== undefined) updateData.title       = data.projectName.trim();
  if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;
  if (data.status       !== undefined) updateData.status     = toStatusLabel(data.status);

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  if (data.status  !== undefined) desc.projectStatus = data.status;
  if (data.domain  !== undefined) desc.domain        = data.domain;
  updateData.description = JSON.stringify(desc);

  // If this is a header row, also update all associated student rows so that
  // the title/academic_year grouping stays consistent. This is a best-effort
  // update — if it fails the header is still updated.
  if (existing.student_id == null && (data.projectName !== undefined || data.academicYear !== undefined)) {
    try {
      const allRows = (await industryProjectRepo.findAll(departmentCode, { limit: 500, search: existing.title })).items;
      const siblings = allRows.filter(
        (r) => r.title === existing.title &&
               r.academic_year === existing.academic_year &&
               r.student_id != null,
      );
      for (const sibling of siblings) {
        const sibUpdate = {};
        if (data.projectName  !== undefined) sibUpdate.title       = data.projectName.trim();
        if (data.academicYear !== undefined) sibUpdate.academicYear = data.academicYear;
        if (data.status       !== undefined) sibUpdate.status      = toStatusLabel(data.status);
        // Also patch description for domain/status in sibling rows
        let sibDesc = {};
        try { sibDesc = JSON.parse(sibling.description || '{}'); } catch {}
        if (data.status !== undefined) sibDesc.projectStatus = data.status;
        if (data.domain !== undefined) sibDesc.domain        = data.domain;
        sibUpdate.description = JSON.stringify(sibDesc);
        await industryProjectRepo.update(sibling.id, sibUpdate);
      }
    } catch (_) {
      // Non-fatal: sibling update failure won't block the header update
    }
  }

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

  // If this is the header row, delete ALL rows in the project group.
  if (existing.student_id == null) {
    await industryProjectRepo.removeProject(existing.title, existing.academic_year);
  } else {
    await industryProjectRepo.remove(id);
  }

  await logActivity({
    performedBy, departmentCode,
    action: 'DELETE_INDUSTRY_PROJECT', module: 'industry_project', recordId: id,
    details: { title: existing.title, studentUsn: existing.usn },
  });

  return { message: 'Industry project deleted successfully.' };
};

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
  if (dup) throw { statusCode: 409, message: 'Student already added to this project.' };

  // Parse latest description from this project to copy domain/status into the new row
  let projDesc = {};
  try { projDesc = JSON.parse(existing.description || '{}'); } catch {}

  const record = await industryProjectRepo.addStudent(id, {
    studentId:    student.library_id,
    facultyId:    existing.faculty_id,
    title:        existing.title,
    description:  JSON.stringify({
      projectStatus: projDesc.projectStatus || existing.status,
      domain:        projDesc.domain || null,
      section:       studentData.section  || student.section_name   || null,
      semester:      studentData.semester || student.semester_number || null,
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

  // studentId here can be the library_id (internal) or the activity_id
  // depending on which route called us. Try by student's library_id first.
  let target = await industryProjectRepo.findByStudentInProject(
    existing.title, existing.academic_year, studentId,
  );
  // Fall back: maybe studentId is actually an activity_id
  if (!target) {
    const byActivityId = await industryProjectRepo.findById(studentId);
    if (byActivityId && byActivityId.title === existing.title) {
      target = byActivityId;
    }
  }
  if (!target) throw { statusCode: 404, message: 'Student not found in project.' };
  // Refuse to delete the project header row through this endpoint
  if (target.student_id == null) throw { statusCode: 400, message: 'Cannot remove project header.' };

  await industryProjectRepo.removeStudent(target.id);

  await logActivity({
    performedBy, departmentCode,
    action: 'REMOVE_PROJECT_STUDENT', module: 'industry_project', recordId: id,
    details: { title: existing.title, studentId },
  });

  return { message: 'Student removed from project successfully.' };
};

module.exports = { getList, getById, create, update, remove, addStudent, removeStudent };

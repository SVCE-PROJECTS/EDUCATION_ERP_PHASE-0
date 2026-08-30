/**
 * Hackathon Service
 * Unified schema: activities activity_type='Hackathon'
 * title = hackathonName, description = {position, year, section, semester}
 */

const hackathonRepo = require('../repositories/hackathon.repository');
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
  const { items, total } = await hackathonRepo.findAll(departmentCode, params);
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
  const record = await hackathonRepo.findById(id);
  if (!record) throw { statusCode: 404, message: 'Hackathon record not found.' };
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
  if (!data.hackathonName) throw { statusCode: 400, message: 'hackathonName is required.' };

  return hackathonRepo.create({
    studentId:   student.library_id,
    facultyId:   data.faculty_id || null,
    title:       data.hackathonName.trim(),
    description: JSON.stringify({
      position: data.position || null,
      year:     data.year     || null,
      section:  student.section_name  || null,
      semester: student.semester_number || null,
    }),
    academicYear: data.academicYear || (data.year ? String(data.year) : null),
    status:       'Completed',
  });
};

const update = async (id, data, departmentCode) => {
  const existing = await hackathonRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Hackathon record not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };

  const updateData = {};
  if (data.hackathonName) updateData.title       = data.hackathonName.trim();
  if (data.academicYear)  updateData.academicYear = data.academicYear;

  let desc = {};
  try { desc = JSON.parse(existing.description || '{}'); } catch {}
  if (data.position !== undefined) desc.position = data.position;
  if (data.year     !== undefined) desc.year     = parseInt(data.year);
  updateData.description = JSON.stringify(desc);

  return hackathonRepo.update(id, updateData);
};

const remove = async (id, departmentCode) => {
  const existing = await hackathonRepo.findById(id);
  if (!existing) throw { statusCode: 404, message: 'Hackathon record not found.' };
  if (departmentCode && existing.department_code !== departmentCode)
    throw { statusCode: 403, message: 'Access denied.' };
  await hackathonRepo.remove(id);
  return { message: 'Hackathon record deleted successfully.' };
};

module.exports = { getList, getById, create, update, remove };

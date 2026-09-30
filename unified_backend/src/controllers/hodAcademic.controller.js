const { query } = require('../config/db');
const subjectRepository = require('../repositories/subjectRepository');
const classRepository = require('../repositories/classRepository');
const timetableRepository = require('../repositories/timetableRepository');
const academicSettingsRepository = require('../repositories/academicSettingsRepository');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, successResponse } = require('../utils/response');

async function getDepartment(departmentCode) {
  if (!departmentCode) throw new ApiError(403, 'HOD department is not configured.');
  const result = await query(
    'SELECT department_id AS id FROM departments WHERE UPPER(department_code) = UPPER($1)',
    [departmentCode],
  );
  if (!result.rows[0]) throw new ApiError(403, 'HOD department was not found.');
  return result.rows[0].id;
}

async function getSemester(semesterNumber) {
  const result = await query(
    'SELECT semester_id AS id FROM semesters WHERE semester_number = $1',
    [semesterNumber],
  );
  if (!result.rows[0]) throw new ApiError(404, 'Semester not found.');
  return result.rows[0].id;
}

async function getOwnedSection(sectionId, semesterId, departmentId) {
  const result = await query(
    `SELECT section_id AS id
     FROM sections
     WHERE section_id = $1 AND semester_id = $2 AND department_id = $3`,
    [sectionId, semesterId, departmentId],
  );
  if (!result.rows[0]) throw new ApiError(400, 'Section does not belong to this department and semester.');
  return result.rows[0].id;
}

const getOptions = asyncHandler(async (req, res) => {
  const departmentId = await getDepartment(req.user.departmentCode);
  const semesterNumber = Number(req.params.semesterNumber);
  const semesterId = await getSemester(semesterNumber);
  const [programsResult, sectionsResult, facultyResult, settings] = await Promise.all([
    query(
      `SELECT program_id AS id, program_name AS name
       FROM programs WHERE department_id = $1 AND is_active = TRUE ORDER BY program_name`,
      [departmentId],
    ),
    query(
      `SELECT section_id AS id, section_name AS name
       FROM sections WHERE department_id = $1 AND semester_id = $2 ORDER BY section_name`,
      [departmentId, semesterId],
    ),
    query(
      `SELECT faculty_id AS id, employee_id AS "employeeId", name, designation
       FROM faculty WHERE department_id = $1 AND status = 'ACTIVE' ORDER BY name`,
      [departmentId],
    ),
    academicSettingsRepository.getCurrentSettings(),
  ]);
  const subjects = await subjectRepository.findAllByDepartment(req.user.departmentCode, { semesterNumber });
  successResponse(res, {
    semesterId,
    semesterNumber,
    academicYear: settings?.academicYear || '',
    programs: programsResult.rows,
    sections: sectionsResult.rows,
    faculty: facultyResult.rows,
    subjects,
  });
});

const getClasses = asyncHandler(async (req, res) => {
  const classes = await classRepository.findAllByDepartment(req.user.departmentCode);
  const semesterNumber = req.query.semesterNumber ? Number(req.query.semesterNumber) : null;
  const sectionId = req.query.sectionId ? Number(req.query.sectionId) : null;
  successResponse(res, classes.filter((item) =>
    (!semesterNumber || Number(item.semesterNumber) === semesterNumber) &&
    (!sectionId || Number(item.sectionId) === sectionId)
  ));
});

const createSubject = asyncHandler(async (req, res) => {
  const departmentId = await getDepartment(req.user.departmentCode);
  const semesterId = await getSemester(Number(req.body.semesterNumber));
  const programResult = await query(
    'SELECT program_id FROM programs WHERE program_id = $1 AND department_id = $2 AND is_active = TRUE',
    [req.body.programId, departmentId],
  );
  if (!programResult.rows[0]) throw new ApiError(400, 'Program does not belong to this department.');
  try {
    const subject = await subjectRepository.create({
      subjectCode: req.body.subjectCode.trim(),
      subjectName: req.body.subjectName.trim(),
      credits: req.body.credits ?? null,
      programId: req.body.programId,
      semesterId,
      departmentId,
    });
    successResponse(res, subject, 'Subject created successfully.', 201);
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'A subject with this code already exists.');
    throw error;
  }
});

const createClass = asyncHandler(async (req, res) => {
  const departmentId = await getDepartment(req.user.departmentCode);
  const semesterId = await getSemester(Number(req.body.semesterNumber));
  await getOwnedSection(req.body.sectionId, semesterId, departmentId);
  const referenceResult = await query(
    `SELECT 1
     FROM subjects sub
     JOIN faculty f ON f.faculty_id = $3 AND f.department_id = $4 AND f.status = 'ACTIVE'
     WHERE sub.subject_id = $1 AND sub.department_id = $4 AND sub.semester_id = $2`,
    [req.body.subjectId, semesterId, req.body.facultyId, departmentId],
  );
  if (!referenceResult.rows[0]) throw new ApiError(400, 'Subject or faculty is not available for this department and semester.');
  const settings = await academicSettingsRepository.getCurrentSettings();
  try {
    const item = await classRepository.create({
      semesterId,
      sectionId: req.body.sectionId,
      subjectId: req.body.subjectId,
      facultyId: req.body.facultyId,
      academicYear: req.body.academicYear || settings?.academicYear || '',
    });
    successResponse(res, item, 'Subject and faculty assigned successfully.', 201);
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'This subject is already assigned to the selected section for that academic year.');
    throw error;
  }
});

const getTimetable = asyncHandler(async (req, res) => {
  const departmentId = await getDepartment(req.user.departmentCode);
  const semesterId = await getSemester(Number(req.query.semesterNumber));
  const sectionId = await getOwnedSection(Number(req.query.sectionId), semesterId, departmentId);
  const timetable = await timetableRepository.getTimetableBySemesterAndSection(semesterId, sectionId);
  successResponse(res, timetable);
});

const deleteClass = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.class_id
     FROM classes c
     JOIN subjects sub ON sub.subject_id = c.subject_id
     JOIN departments d ON d.department_id = sub.department_id
     WHERE c.class_id = $1 AND d.department_code = $2`,
    [req.params.id, req.user.departmentCode],
  );
  if (!result.rows[0]) throw new ApiError(404, 'Subject-faculty assignment not found.');
  try {
    await classRepository.remove(req.params.id);
    successResponse(res, { deleted: true });
  } catch (error) {
    if (error.code === '23503') throw new ApiError(409, 'Remove this assignment from the timetable before deleting it.');
    throw error;
  }
});

const createTimetable = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.class_id
     FROM classes c
     JOIN subjects sub ON sub.subject_id = c.subject_id
     JOIN departments d ON d.department_id = sub.department_id
     WHERE c.class_id = $1 AND d.department_code = $2`,
    [req.body.classId, req.user.departmentCode],
  );
  if (!result.rows[0]) throw new ApiError(400, 'Select a subject-faculty assignment from your department.');
  try {
    const item = await timetableRepository.create({
      classId: req.body.classId,
      dayOfWeek: req.body.dayOfWeek,
      period: req.body.period,
      roomNumber: req.body.roomNumber,
    });
    successResponse(res, item, 'Timetable slot created successfully.', 201);
  } catch (error) {
    if (error.code === '23505' || error.code === 'P0001') {
      throw new ApiError(409, error.code === 'P0001'
        ? 'This faculty member is already assigned to another class at that time.'
        : 'This class already has a slot at that day and period.');
    }
    throw error;
  }
});

const deleteTimetable = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT tt.timetable_id
     FROM timetable tt
     JOIN classes c ON c.class_id = tt.class_id
     JOIN subjects sub ON sub.subject_id = c.subject_id
     JOIN departments d ON d.department_id = sub.department_id
     WHERE tt.timetable_id = $1 AND d.department_code = $2`,
    [req.params.id, req.user.departmentCode],
  );
  if (!result.rows[0]) throw new ApiError(404, 'Timetable slot not found.');
  await timetableRepository.remove(req.params.id);
  successResponse(res, { deleted: true });
});

module.exports = { getOptions, getClasses, createSubject, createClass, deleteClass, getTimetable, createTimetable, deleteTimetable };
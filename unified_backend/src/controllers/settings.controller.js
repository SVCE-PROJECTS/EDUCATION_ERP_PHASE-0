const asyncHandler = require('../utils/asyncHandler');
const { success, ApiError } = require('../utils/apiResponse');
const academicSettingsRepository = require('../repositories/academicSettingsRepository');
const departmentRepository = require('../repositories/department.repository');

// ── Academic year / semester config ────────────────────────────────────────────

const getAcademicYear = asyncHandler(async (req, res) => {
  const settings = await academicSettingsRepository.getCurrentSettings();
  success(res, settings);
});

const updateAcademicYear = asyncHandler(async (req, res) => {
  const { academicYear, currentSemesterType } = req.body;
  if (!academicYear || !currentSemesterType) {
    throw new ApiError(400, 'academicYear and currentSemesterType are required.');
  }
  const settings = await academicSettingsRepository.upsertSettings({ academicYear, currentSemesterType });
  success(res, settings);
});

// ── Departments ──────────────────────────────────────────────────────────────

const listDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentRepository.findAll();
  success(res, departments);
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    throw new ApiError(400, 'name and code are required.');
  }
  try {
    const department = await departmentRepository.create({ name, code });
    success(res, department, null, 201);
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'A department with that name or code already exists.');
    }
    throw err;
  }
});

const setDepartmentActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const department = await departmentRepository.setActive(req.params.id, isActive !== false);
  if (!department) throw new ApiError(404, 'Department not found.');
  success(res, department);
});

module.exports = {
  getAcademicYear,
  updateAcademicYear,
  listDepartments,
  createDepartment,
  setDepartmentActive,
};

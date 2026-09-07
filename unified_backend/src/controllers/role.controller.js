const facultyService = require('../services/faculty.service');
const roleRepository = require('../repositories/role.repository');
const { successResponse, errorResponse } = require('../utils/response');

// The four coordinator roles selectable from the HOD portal. These must exist
// in the `roles` table (see database/unified_seed_empty.sql) — the actual
// role_id is looked up from the DB below, never hardcoded, so it always
// matches whatever row `coordinator_assignments.role_id` will reference.
const COORDINATOR_ROLE_NAMES = [
  'timetable_coordinator',
  'exam_coordinator',
  'cultural_coordinator',
  'placement_coordinator',
];

const toLabel = (roleName) =>
  roleName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const getAllRoles = async (req, res, next) => {
  try {
    // FIXED: previously returned hardcoded ids ('1'-'4') that did not match
    // the real roles.role_id values in the database. Assigning a coordinator
    // role would then silently insert the WRONG role_id into
    // coordinator_assignments (e.g. 'Timetable Coordinator' could end up
    // pointing at 'super_admin'). Now we read the real rows from the roles
    // table so the id sent to the frontend is always correct.
    const allRoles = await roleRepository.findAll(); // [{ id, name, description }]

    const roles = allRoles
      .filter((r) => COORDINATOR_ROLE_NAMES.includes(r.name))
      .map((r) => ({
        id: String(r.id),
        name: toLabel(r.name),
        slug: r.name.toUpperCase(),
        isActive: true,
      }));

    return successResponse(res, roles);
  } catch (err) {
    next(err);
  }
};

const getFacultyRoles = async (req, res, next) => {
  try {
    const roles = await facultyService.getFacultyRoles?.(req.params.id, req.user.departmentCode);
    return successResponse(res, roles || []);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const syncRoles = async (req, res, next) => {
  try {
    const { add, remove } = req.body;
    const result = await facultyService.syncRoles(
      req.params.id,
      { add, remove },
      req.user.id,
      req.user.departmentCode
    );
    return successResponse(res, result, 'Roles synced successfully');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { getAllRoles, getFacultyRoles, syncRoles };

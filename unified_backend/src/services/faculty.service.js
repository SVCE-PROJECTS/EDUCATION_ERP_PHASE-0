const bcrypt = require('bcryptjs');
const facultyRepo = require('../repositories/faculty.repository');
const auditRepo = require('../repositories/audit.repository');
const { query } = require('../config/db');

async function resolveDepartmentId(departmentCodeInput) {
  const raw = String(departmentCodeInput || '').trim();
  if (!raw) return null;

  const aliases = {
    CS: 'CSE',
    CSE: 'CSE',
    'CSE-AI': 'CSE-AI',
    'CSE-DS': 'CSE-DS',
    'CSE-CY': 'CSE-CY',
    ISE: 'ISE',
    ECE: 'ECE',
    CIVIL: 'CIVIL',
    MECHANICAL: 'MECHANICAL',
  };

  const normalized = raw.toUpperCase();
  const targetCode = aliases[normalized] || normalized;

  const result = await query(
    'SELECT department_id FROM departments WHERE UPPER(department_code) = UPPER($1)',
    [targetCode],
  );
  return result.rows[0]?.department_id || null;
}

/**
 * Get paginated faculty list (department-scoped)
 */
const getFacultyList = async (departmentCode, queryParams) => {
  const page    = Math.max(1, parseInt(queryParams.page)  || 1);
  const limit   = Math.min(100, parseInt(queryParams.limit) || 10);
  const search  = queryParams.search?.trim() || null;
  const status  = queryParams.status  || null;
  const sortBy  = queryParams.sortBy  || 'name';
  const sortOrder = queryParams.sortOrder || 'asc';

  const { items, total } = await facultyRepo.findAllByDepartment(departmentCode, {
    page, limit, search, status, sortBy, sortOrder,
  });

  return {
    items: items.map(sanitizeFaculty),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get faculty by id (department-scoped)
 * ID is the employeeId (string like "EMP001")
 */
const getFacultyById = async (id, requestingDepartmentCode) => {
  const faculty = await facultyRepo.findByEmployeeId(id);
  if (!faculty) {
    throw { statusCode: 404, message: 'Faculty not found.' };
  }
  if (faculty.departmentCode !== requestingDepartmentCode) {
    throw { statusCode: 403, message: 'Access denied.' };
  }
  return sanitizeFaculty(faculty);
};

/**
 * Create faculty
 */
const createFaculty = async (data, createdBy, departmentCode) => {
  // Check uniqueness
  const conflict = await facultyRepo.checkUnique({
    employeeId: data.employeeId,
    username:   data.username,
    email:      data.email,
  });
  if (conflict) {
    const field = conflict.employeeId === data.employeeId ? 'Employee ID'
                : conflict.username   === data.username   ? 'Username'
                : 'Email';
    throw { statusCode: 409, message: `${field} already exists.` };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const departmentId = await resolveDepartmentId(departmentCode);
  if (!departmentId) {
    throw { statusCode: 400, message: `Department not found: ${departmentCode}` };
  }

  const faculty = await facultyRepo.create({
    employeeId:       data.employeeId,
    name:             data.name,
    email:            data.email,
    phone:            data.phone || null,
    designation:      data.designation,
    qualification:    data.qualification,
    experienceYears:  parseInt(data.experienceYears ?? data.experience ?? 0) || 0,
    specialization:   data.specialization || null,
    status:           data.status || 'ACTIVE',
    departmentId,
    username:         data.username,
    passwordHash,
    coordinatorRoles: null,  // No roles initially
  });

  await auditRepo.log({
    performedBy: createdBy,
    action:      'CREATE_FACULTY',
    facultyId:   faculty.employeeId,
    details:     { name: faculty.name, employeeId: faculty.employeeId },
    departmentId,
  });

  return sanitizeFaculty(faculty);
};

/**
 * Update faculty
 */
const updateFaculty = async (id, data, updatedBy, departmentCode) => {
  const existing = await facultyRepo.findByEmployeeId(id);
  if (!existing) {
    throw { statusCode: 404, message: 'Faculty not found.' };
  }
  if (existing.departmentCode !== departmentCode) {
    throw { statusCode: 403, message: 'Access denied.' };
  }

  // Check uniqueness excluding current record
  const conflict = await facultyRepo.checkUnique(
    {
      ...(data.employeeId && { employeeId: data.employeeId }),
      ...(data.email      && { email:      data.email }),
    },
    id
  );
  if (conflict) {
    const field = conflict.employeeId === data.employeeId ? 'Employee ID' : 'Email';
    throw { statusCode: 409, message: `${field} already exists.` };
  }

  const updateData = {};
  const fields = ['name','email','phone','designation','qualification','specialization','status'];
  fields.forEach((f) => {
    if (data[f] !== undefined) updateData[f] = data[f];
  });
  if (data.employeeId) updateData.employeeId = data.employeeId;
  if (data.experienceYears !== undefined) {
    updateData.experienceYears = parseInt(data.experienceYears, 10);
  } else if (data.experience !== undefined) {
    updateData.experienceYears = parseInt(data.experience, 10);
  }
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
  if (data.photo !== undefined) updateData.photoUrl = data.photo;

  // Allow password update
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  const updated = await facultyRepo.update(id, updateData);

  await auditRepo.log({
    performedBy: updatedBy,
    action:      'UPDATE_FACULTY',
    facultyId:   id,
    details:     { updatedFields: Object.keys(updateData) },
    departmentId: existing.departmentId,
  });

  return sanitizeFaculty(updated);
};

/**
 * Delete faculty
 */
const deleteFaculty = async (id, deletedBy, departmentCode) => {
  const faculty = await facultyRepo.findByEmployeeId(id);
  if (!faculty) {
    throw { statusCode: 404, message: 'Faculty not found.' };
  }
  if (faculty.departmentCode !== departmentCode) {
    throw { statusCode: 403, message: 'Access denied.' };
  }

  // Cannot delete HOD
  const isHOD = faculty.designation.includes('HOD');
  if (isHOD) {
    throw { statusCode: 400, message: 'Cannot delete HOD. Reassign HOD role first.' };
  }

  await auditRepo.log({
    performedBy: deletedBy,
    action:      'DELETE_FACULTY',
    facultyId:   null,
    details:     { name: faculty.name, employeeId: faculty.employeeId },
    departmentId: faculty.departmentId,
  });

  await facultyRepo.remove(id);
  return { message: 'Faculty deleted successfully.' };
};

/**
 * Assign or remove coordinator roles
 */
const syncRoles = async (facultyId, { add, remove }, syncedBy, departmentCode) => {
  const faculty = await facultyRepo.findByEmployeeId(facultyId);
  if (!faculty) throw { statusCode: 404, message: 'Faculty not found.' };
  if (faculty.departmentCode !== departmentCode) throw { statusCode: 403, message: 'Access denied.' };

  // Current roles as array
  const currentRoles = faculty.coordinatorRoles 
    ? faculty.coordinatorRoles.split(',').map(r => r.trim())
    : [];

  // Add roles
  const VALID_ROLES = ['TIMETABLE_COORDINATOR', 'EXAM_COORDINATOR', 'CULTURAL_COORDINATOR', 'PLACEMENT_COORDINATOR'];

  // FIXED: previously an invalid roleId (e.g. a numeric role_id sent instead
  // of a slug) was silently ignored here — VALID_ROLES.includes(roleId)
  // just evaluated false and nothing happened — while the response below
  // still reported it as "added" (since it isn't in currentRoles either),
  // so the app showed a success toast for a change that was never actually
  // persisted. Now this throws a clear, immediate error instead.
  const invalidIds = [...(add || []), ...(remove || [])].filter((r) => !VALID_ROLES.includes(r));
  if (invalidIds.length > 0) {
    throw {
      statusCode: 400,
      message: `Invalid role identifier(s): ${invalidIds.join(', ')}. Expected one of: ${VALID_ROLES.join(', ')}.`,
    };
  }

  let newRoles = [...currentRoles];
  
  for (const roleId of (add || [])) {
    // roleId is actually the role slug from frontend
    if (VALID_ROLES.includes(roleId) && !newRoles.includes(roleId)) {
      newRoles.push(roleId);
    }
  }

  for (const roleId of (remove || [])) {
    newRoles = newRoles.filter(r => r !== roleId);
  }

  const coordinatorRoles = newRoles.length > 0 ? newRoles.join(',') : null;
  await facultyRepo.update(facultyId, { coordinatorRoles });

  // Log the changes
  const added = (add || []).filter(r => !currentRoles.includes(r));
  const removed = (remove || []).filter(r => currentRoles.includes(r));

  if (added.length > 0) {
    await auditRepo.log({
      performedBy: syncedBy,
      action: 'ASSIGN_ROLE',
      facultyId,
      details: { roles: added },
      departmentId: faculty.departmentId,
    });
  }

  if (removed.length > 0) {
    await auditRepo.log({
      performedBy: syncedBy,
      action: 'REMOVE_ROLE',
      facultyId,
      details: { roles: removed },
      departmentId: faculty.departmentId,
    });
  }

  const updated = await facultyRepo.findByEmployeeId(facultyId);
  return {
    data: sanitizeFaculty(updated),
    results: { added, removed },
  };
};

/**
 * Format faculty object for API response
 */
const sanitizeFaculty = (f) => {
  const { passwordHash, ...safe } = f;
  
  // Convert coordinatorRoles string to roles array for frontend
  const coordinatorRoles = f.coordinatorRoles 
    ? f.coordinatorRoles.split(',').map(r => ({
        role: { id: null, name: r.trim(), slug: r.trim() }
      }))
    : [];
  
  const isHOD = f.designation.includes('HOD');
  const roles = [...coordinatorRoles];
  
  if (isHOD) {
    roles.push({ role: { id: null, name: 'HOD', slug: 'HOD' } });
    roles.push({ role: { id: null, name: 'Faculty', slug: 'FACULTY' } });
  } else {
    roles.push({ role: { id: null, name: 'Faculty', slug: 'FACULTY' } });
  }

  const department = f.department_id || f.departmentId
    ? {
        id: f.department_id || f.departmentId || null,
        name: f.department_name || f.departmentName || null,
        code: f.departmentCode || null,
      }
    : {
        id: null,
        name: f.departmentCode || null,
        code: f.departmentCode || null,
      };

  return {
    ...safe,
    roles,
    department,
  };
};

module.exports = {
  getFacultyList,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  syncRoles,
  resolveDepartmentId,
};

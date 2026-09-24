const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { ApiError } = require('../utils/response');
const auditRepository = require('../repositories/audit.repository');
const facultyService = require('../services/faculty.service');

/**
 * GET /api/audit-logs
 * Query: page, pageSize, module, action, dateFrom, dateTo
 * Admin-only — backs the admin Activity Log screen.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const {
    page, pageSize, module: moduleFilter, action, dateFrom, dateTo,
  } = req.query;

  const pageNum = page ? parseInt(page, 10) : 1;
  const size = pageSize ? parseInt(pageSize, 10) : 25;

  const { rows, total } = await auditRepository.findAll({
    page: pageNum,
    pageSize: size,
    module: moduleFilter,
    action,
    dateFrom,
    dateTo,
  });

  success(res, rows, {
    page: pageNum,
    pageSize: size,
    total,
    totalPages: Math.ceil(total / size) || 1,
  });
});

/**
 * GET /api/audit-logs/department
 * Query: page, pageSize, module, action, dateFrom, dateTo
 * HOD-only — department scope is resolved server-side from the caller's
 * own JWT (req.user.departmentCode), never from a client-supplied param,
 * so a HOD can only ever see their own department's activity.
 *
 * `module` is optional and client-supplied on purpose — unlike department,
 * it only narrows within the department's own data (faculty, technical
 * events, sports activities, ...), it never widens scope.
 */
const listDepartmentAuditLogs = asyncHandler(async (req, res) => {
  const {
    page, pageSize, module: moduleFilter, action, dateFrom, dateTo,
  } = req.query;

  const departmentId = await facultyService.resolveDepartmentId(req.user.departmentCode);
  if (!departmentId) {
    throw new ApiError(400, `Department not found: ${req.user.departmentCode}`);
  }

  const pageNum = page ? parseInt(page, 10) : 1;
  const size = pageSize ? parseInt(pageSize, 10) : 25;

  const { rows, total } = await auditRepository.findAll({
    page: pageNum,
    pageSize: size,
    module: moduleFilter,
    action,
    dateFrom,
    dateTo,
    departmentId,
  });

  success(res, rows, {
    page: pageNum,
    pageSize: size,
    total,
    totalPages: Math.ceil(total / size) || 1,
  });
});

module.exports = { listAuditLogs, listDepartmentAuditLogs };

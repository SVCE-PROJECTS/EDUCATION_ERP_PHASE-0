const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const auditRepository = require('../repositories/audit.repository');

/**
 * GET /api/audit-logs
 * Query: page, pageSize, module, action, dateFrom, dateTo
 * Admin-only — backs the Activity Log screen.
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

module.exports = { listAuditLogs };

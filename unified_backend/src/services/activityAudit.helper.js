const auditRepo = require('../repositories/audit.repository');
const { resolveDepartmentId } = require('./faculty.service');

/**
 * Shared audit-log writer for the six student-activity services (technical
 * events, sports, cultural, industry projects, hackathons, other curricular)
 * so each one doesn't re-implement departmentCode -> departmentId resolution
 * and the auditRepo wiring on its own.
 *
 * Best-effort: auditRepo.create() already swallows its own errors, so a
 * logging failure never blocks the caller's actual mutation.
 */
async function logActivity({
  performedBy, departmentCode, action, module, recordId, details,
}) {
  const departmentId = await resolveDepartmentId(departmentCode);
  return auditRepo.create({
    userId: performedBy,
    action,
    module,
    recordId: recordId != null ? String(recordId) : null,
    oldValue: null,
    newValue: details || null,
    departmentId,
  });
}

module.exports = { logActivity };

const express = require('express');
const auditController = require('../controllers/audit.controller');
const { authenticate, requireAdmin, requireHOD } = require('../middleware/authenticate');

const router = express.Router();

// Order matters: '/department' must be registered before the admin '/'
// catch-all reads req.query only, but keep the specific route first for clarity.
router.get('/department', authenticate, requireHOD, auditController.listDepartmentAuditLogs);

// GET /api/audit-logs/me — any authenticated user, own entries only.
// Must be registered before '/' so it isn't shadowed by the admin route.
router.get('/me', authenticate, auditController.getMyLogs);

router.get('/', authenticate, requireAdmin, auditController.listAuditLogs);

module.exports = router;

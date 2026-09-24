const express = require('express');
const auditController = require('../controllers/audit.controller');
const { authenticate, requireAdmin, requireHOD } = require('../middleware/authenticate');

const router = express.Router();

// Order matters: '/department' must be registered before the admin '/'
// catch-all reads req.query only, but keep the specific route first for clarity.
router.get('/department', authenticate, requireHOD, auditController.listDepartmentAuditLogs);
router.get('/', authenticate, requireAdmin, auditController.listAuditLogs);

module.exports = router;

const express = require('express');
const auditController = require('../controllers/audit.controller');
const { authenticate, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

router.get('/', authenticate, requireAdmin, auditController.listAuditLogs);

module.exports = router;

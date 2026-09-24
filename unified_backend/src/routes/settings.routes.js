const express = require('express');
const settingsController = require('../controllers/settings.controller');
const { authenticate, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/academic-year', settingsController.getAcademicYear);
router.put('/academic-year', settingsController.updateAcademicYear);

router.get('/departments', settingsController.listDepartments);
router.post('/departments', settingsController.createDepartment);
router.patch('/departments/:id/status', settingsController.setDepartmentActive);

module.exports = router;

const express = require('express');
const ctrl = require('../controllers/industryProject.controller');
const { authenticate, requireHOD } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { createIndustryProjectRules, updateIndustryProjectRules, industryStudentRules } = require('../validators/activityValidator');

const router = express.Router();
router.use(authenticate);

router.get('/',     ctrl.getList);
router.get('/:id',  ctrl.getById);
router.post('/',    requireHOD, validate(createIndustryProjectRules), ctrl.create);
router.put('/:id',  requireHOD, validate(updateIndustryProjectRules), ctrl.update);
router.delete('/:id', requireHOD, ctrl.remove);

// Students within a project
router.post('/:id/students',           requireHOD, validate(industryStudentRules), ctrl.addStudent);
router.delete('/:id/students/:studentId', requireHOD, ctrl.removeStudent);

module.exports = router;

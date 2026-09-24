const express = require('express');
const { param } = require('express-validator');
const dropdownController = require('../controllers/dropdownController');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Get sections filtered by semester (must come before /:type route)
router.get(
  '/sections/:semesterId',
  validate([
    param('semesterId').isInt({ min: 1, max: 8 })
      .withMessage('Semester ID must be between 1 and 8'),
  ]),
  dropdownController.getSectionsBySemester,
);

// Get departments filtered by program
router.get(
  '/departments/:programId',
  validate([
    param('programId').isInt({ min: 1 })
      .withMessage('Program ID must be a positive integer'),
  ]),
  dropdownController.getDepartmentsByProgram,
);

router.get(
  '/:type',
  validate([
    param('type').isIn(['program', 'department', 'section', 'semester', 'gender', 'staff-department'])
      .withMessage('Unsupported dropdown type'),
  ]),
  dropdownController.getByType,
);

module.exports = router;

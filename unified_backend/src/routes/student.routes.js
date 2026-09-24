/**
 * Unified Student Routes
 * Merged from Admin-erp, faculty_student, and education_erp
 */

const express = require('express');
const { param } = require('express-validator');
const studentController = require('../controllers/studentController');
const { authenticate } = require('../middleware/authenticate');
const { validate, validateId } = require('../middleware/validate');
const {
  createStudentRules, updateStudentRules, idParamRule, listStudentsRules,
} = require('../validators/studentValidator');

const router = express.Router();

// ── Admin-erp: paginated list ─────────────────────────────────────────────────
router.get('/list',     authenticate, validate(listStudentsRules), studentController.listStudents);

// ── faculty: students by semester+section (no HOD restriction) ───────────────
router.get('/by-section/:semester/:section',
  authenticate,
  validate([
    param('semester').isInt({ min: 1, max: 8 }).toInt(),
    param('section').isLength({ min: 1, max: 10 }).trim(),
  ]),
  studentController.getStudentsBySection,
);

// ── education_erp: semester/section structure ─────────────────────────────────
router.get('/semesters', authenticate, studentController.getSemesters);

router.get('/semesters/:semester/sections',
  authenticate,
  validate([param('semester').isInt({ min: 1, max: 8 }).toInt()]),
  studentController.getSections,
);

router.get('/semesters/:semester/sections/:section',
  authenticate,
  validate([
    param('semester').isInt({ min: 1, max: 8 }).toInt(),
    param('section').isLength({ min: 1, max: 10 }).trim(),
  ]),
  studentController.getSectionDashboard,
);

// ── faculty_student: simple list ──────────────────────────────────────────────
router.get('/', authenticate, studentController.getStudents);

// ── Name autocomplete (must precede /:id so "search" isn't read as an id) ────
router.get('/search', authenticate, studentController.searchByName);

// ── Comprehensive profile ─────────────────────────────────────────────────────
router.get('/:id/profile', authenticate, validate(idParamRule), studentController.getStudentProfile);

// ── Get by ID ─────────────────────────────────────────────────────────────────
router.get('/:id', authenticate, validate(idParamRule), studentController.getById);

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', authenticate, validate(createStudentRules), studentController.createStudent);

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', authenticate, validate(updateStudentRules), studentController.updateStudent);

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, validate(idParamRule), studentController.deleteStudent);

module.exports = router;

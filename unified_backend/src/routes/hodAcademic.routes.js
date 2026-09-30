const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, requireHOD } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const controller = require('../controllers/hodAcademic.controller');

const router = Router();

router.use(authenticate, requireHOD);

router.get('/options/:semesterNumber',
  validate([param('semesterNumber').isInt({ min: 1, max: 8 }).toInt()]),
  controller.getOptions,
);
router.get('/classes',
  validate([
    query('semesterNumber').optional().isInt({ min: 1, max: 8 }).toInt(),
    query('sectionId').optional().isInt({ min: 1 }).toInt(),
  ]),
  controller.getClasses,
);
router.post('/subjects', validate([
  body('subjectCode').isString().trim().isLength({ min: 1, max: 20 }),
  body('subjectName').isString().trim().isLength({ min: 1, max: 100 }),
  body('programId').isInt({ min: 1 }).toInt(),
  body('semesterNumber').isInt({ min: 1, max: 8 }).toInt(),
  body('credits').optional({ nullable: true }).isInt({ min: 0, max: 30 }).toInt(),
]), controller.createSubject);
router.post('/classes', validate([
  body('semesterNumber').isInt({ min: 1, max: 8 }).toInt(),
  body('sectionId').isInt({ min: 1 }).toInt(),
  body('subjectId').isInt({ min: 1 }).toInt(),
  body('facultyId').isInt({ min: 1 }).toInt(),
  body('academicYear').optional().isString().trim().isLength({ max: 20 }),
]), controller.createClass);
router.delete('/classes/:id',
  validate([param('id').isInt({ min: 1 }).toInt()]),
  controller.deleteClass,
);
router.get('/timetable', validate([
  query('semesterNumber').isInt({ min: 1, max: 8 }).toInt(),
  query('sectionId').isInt({ min: 1 }).toInt(),
]), controller.getTimetable);
router.post('/timetable', validate([
  body('classId').isInt({ min: 1 }).toInt(),
  body('dayOfWeek').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  body('period').isInt({ min: 1, max: 8 }).toInt(),
  body('roomNumber').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
]), controller.createTimetable);
router.delete('/timetable/:id',
  validate([param('id').isInt({ min: 1 }).toInt()]),
  controller.deleteTimetable,
);

module.exports = router;
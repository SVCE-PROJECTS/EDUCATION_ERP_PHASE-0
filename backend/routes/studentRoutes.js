const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getStudents,
  getStudentProfile,
  addStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

// All student routes require a valid JWT
router.use(authenticate);

router.get('/',            getStudents);
router.get('/:id/profile', getStudentProfile);
router.post('/',           addStudent);
router.put('/:id',         updateStudent);
router.delete('/:id',      deleteStudent);

module.exports = router;

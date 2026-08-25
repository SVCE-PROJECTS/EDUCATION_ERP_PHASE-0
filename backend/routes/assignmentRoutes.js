const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getAssignments, addAssignment, updateAssignment, deleteAssignment,
} = require('../controllers/assignmentController');

router.use(authenticate);

router.get('/',     getAssignments);
router.post('/',    addAssignment);
router.put('/:id',  updateAssignment);
router.delete('/:id', deleteAssignment);

module.exports = router;

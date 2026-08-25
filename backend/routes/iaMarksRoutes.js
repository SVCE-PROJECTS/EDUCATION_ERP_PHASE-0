const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getIAMarks, addIAMarks, updateIAMarks, deleteIAMarks,
} = require('../controllers/iaMarksController');

router.use(authenticate);

router.get('/',     getIAMarks);
router.post('/',    addIAMarks);
router.put('/:id',  updateIAMarks);
router.delete('/:id', deleteIAMarks);

module.exports = router;

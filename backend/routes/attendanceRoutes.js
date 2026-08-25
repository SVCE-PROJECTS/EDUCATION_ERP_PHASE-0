const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getAttendance,
  saveAttendance,
  saveAttendanceBulk,
} = require('../controllers/attendanceController');

router.use(authenticate);

router.get('/',     getAttendance);       // GET  /attendance?subject=X&date=Y
router.post('/',    saveAttendance);      // POST /attendance  (single)
router.post('/bulk', saveAttendanceBulk); // POST /attendance/bulk (array)

module.exports = router;

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getDashboardStats,
  getWeeklyAttendance,
} = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/stats',             getDashboardStats);   // GET /dashboard/stats
router.get('/weekly-attendance', getWeeklyAttendance); // GET /dashboard/weekly-attendance

module.exports = router;

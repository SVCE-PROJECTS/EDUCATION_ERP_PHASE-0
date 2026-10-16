const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// Any authenticated user (admin/HOD/faculty) — the controller itself scopes
// the response down based on req.user's role, same pattern as /dashboard/stats.
router.use(authenticate);

router.get('/overview', analyticsController.getOverview);

module.exports = router;

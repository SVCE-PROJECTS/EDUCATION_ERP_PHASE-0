/**
 * Schedule Routes
 * Personal calendar/schedule management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  completeSchedule,
  markPendingSchedule,
  deleteSchedule,
} = require('../controllers/schedule.controller');

// All routes require authentication
router.use(authenticate);

// GET /api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', getSchedules);

// POST /api/schedules
router.post('/', createSchedule);

// PUT /api/schedules/:id
router.put('/:id', updateSchedule);

// PATCH /api/schedules/:id/complete
router.patch('/:id/complete', completeSchedule);

// PATCH /api/schedules/:id/pending
router.patch('/:id/pending', markPendingSchedule);

// DELETE /api/schedules/:id
router.delete('/:id', deleteSchedule);

module.exports = router;

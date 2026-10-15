/**
 * Meeting Management Routes
 * Role-based access control for meeting operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireAdmin, requireHOD } = require('../middleware/authenticate');
const {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  approveMeeting,
  updateAvailability,
  startMeeting,
  completeMeeting,
  getTodayMeetings,
  getMeetingNotifications,
  markMeetingNotificationRead,
} = require('../controllers/meeting.controller');

const {
  upload,
  uploadDocument,
  getDocuments,
  deleteDocument,
} = require('../controllers/meetingDocument.controller');

const {
  saveMinutes,
  getMinutes,
  createActionItem,
  getActionItems,
  updateActionItem,
} = require('../controllers/meetingMinutes.controller');

const {
  getFacultyForInvitation,
  getMeetingParticipants,
  addParticipant,
  removeParticipant,
} = require('../controllers/meetingParticipants.controller');

// All routes require authentication
router.use(authenticate);

// ── Utility Routes ────────────────────────────────────────────────────────────

// GET /api/meetings/faculty - Get faculty for invitation
router.get('/faculty', getFacultyForInvitation);
router.get('/today', getTodayMeetings);
router.get('/notifications', getMeetingNotifications);
router.patch('/notifications/:notificationId/read', markMeetingNotificationRead);

// ── Meeting Management ────────────────────────────────────────────────────────

// GET /api/meetings - Get meetings (role-based filtering)
router.get('/', getMeetings);

// GET /api/meetings/:id - Get meeting details
router.get('/:id', getMeetingById);

// POST /api/meetings - Create new meeting (all authenticated users)
router.post('/', createMeeting);

// PUT /api/meetings/:id - Update meeting (creator or admin only)
router.put('/:id', updateMeeting);

// DELETE /api/meetings/:id - Delete meeting (creator or admin only)
router.delete('/:id', deleteMeeting);

// POST /api/meetings/:id/approve - Approve/reject meeting (HOD/Admin only)
router.post('/:id/approve', approveMeeting);

// POST /api/meetings/:id/availability - Update participant availability
router.post('/:id/availability', updateAvailability);

// POST /api/meetings/:id/start - Start meeting (creator or admin only)
router.post('/:id/start', startMeeting);

// POST /api/meetings/:id/complete - Complete meeting (creator or admin only)
router.post('/:id/complete', completeMeeting);

// ── Document Management ───────────────────────────────────────────────────────

// POST /api/meetings/:id/documents - Upload document (participants/creator/admin)
router.post('/:id/documents', upload, uploadDocument);

// GET /api/meetings/:id/documents - Get meeting documents
router.get('/:id/documents', getDocuments);

// DELETE /api/meetings/:meetingId/documents/:documentId - Delete document
router.delete('/:meetingId/documents/:documentId', deleteDocument);

// ── Minutes & Action Items ────────────────────────────────────────────────────

// POST /api/meetings/:id/minutes - Create/update meeting minutes (creator/admin)
router.post('/:id/minutes', saveMinutes);

// GET /api/meetings/:id/minutes - Get meeting minutes
router.get('/:id/minutes', getMinutes);

// POST /api/meetings/:id/action-items - Create action item (creator/admin)
router.post('/:id/action-items', createActionItem);

// GET /api/meetings/:id/action-items - Get action items
router.get('/:id/action-items', getActionItems);

// PUT /api/meetings/:meetingId/action-items/:itemId - Update action item
router.put('/:meetingId/action-items/:itemId', updateActionItem);

// ── Participant Management ────────────────────────────────────────────────────

// GET /api/meetings/:id/participants - Get meeting participants
router.get('/:id/participants', getMeetingParticipants);

// POST /api/meetings/:id/participants - Add participant (creator/admin)
router.post('/:id/participants', addParticipant);

// DELETE /api/meetings/:id/participants/:participantId - Remove participant
router.delete('/:id/participants/:participantId', removeParticipant);

module.exports = router;
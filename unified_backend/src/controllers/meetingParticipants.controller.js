/**
 * Meeting Participants Controller
 * Manages meeting participants and faculty lookup
 */

const pool = require('../config/db').pool;
const { logger } = require('../utils/logger');

/**
 * Get available faculty for meeting invitation
 * GET /api/meetings/faculty?department_code=CSE&search=john
 */
const getFacultyForInvitation = async (req, res) => {
  const { department_code, search } = req.query;

  try {
    let conditions = ["f.status = 'ACTIVE'"];
    let params = [];

    // Never let a user invite themselves. For faculty/HOD callers req.user.id
    // holds their own employee_id; for admin it's a numeric user_id that never
    // matches an employee_id, so this is a no-op for admin (admin has no
    // faculty row anyway).
    if (req.user?.id) {
      params.push(req.user.id);
      conditions.push('f.employee_id != $' + params.length);
    }

    // Everyone can invite across departments — department_code narrows the
    // list when a caller explicitly asks for one department, but it's never
    // forced to the caller's own department.
    if (department_code) {
      params.push(department_code);
      conditions.push('d.department_code = $' + params.length);
    }

    // Search filter
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(f.name) LIKE $${params.length} OR LOWER(f.employee_id) LIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT
        f.employee_id as id,
        f.name,
        f.designation,
        f.email,
        d.department_name,
        d.department_code,
        f.is_hod
      FROM faculty f
      JOIN departments d ON f.department_id = d.department_id
      ${whereClause}
      ORDER BY f.name
      LIMIT 100
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching faculty for invitation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get meeting participants with their status
 * GET /api/meetings/:id/participants
 */
const getMeetingParticipants = async (req, res) => {
  const { id } = req.params;

  try {
    // Check meeting access
    const meetingResult = await pool.query(
      `SELECT m.*, d.department_code,
       EXISTS(SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = m.meeting_id AND mp.participant_user_id = $2) as is_participant
       FROM meetings m
       LEFT JOIN departments d ON m.department_id = d.department_id
       WHERE m.meeting_id = $1 AND m.status != 'deleted'`,
      [id, req.user.id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Check access
    const hasAccess = meeting.requester_user_id === req.user.id ||
                     meeting.is_participant ||
                     req.user.role === 'admin' ||
                     (req.user.role !== 'admin' && meeting.department_code === req.user.departmentCode);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get participants with details
    const participantsQuery = `
      SELECT
        mp.*,
        mp.participant_name as name,
        f.designation,
        mp.participant_email as email,
        d.department_name,
        d.department_code
      FROM meeting_participants mp
      LEFT JOIN users u ON mp.participant_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      LEFT JOIN departments d ON f.department_id = d.department_id
      WHERE mp.meeting_id = $1
      ORDER BY mp.participant_name
    `;

    const result = await pool.query(participantsQuery, [id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching meeting participants:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add participant to meeting
 * POST /api/meetings/:id/participants
 */
const addParticipant = async (req, res) => {
  const { id } = req.params;
  const { participant_id, participation_type = 'invited' } = req.body;

  if (!participant_id) {
    return res.status(400).json({ success: false, message: 'participant_id is required' });
  }

  try {
    // Check if user can modify participants (creator or admin)
    const meetingResult = await pool.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    if (meeting.requester_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only meeting creator or admin can add participants' });
    }

    // Check if participant already exists
    const existingParticipant = await pool.query(
      `SELECT participant_id FROM meeting_participants mp
       LEFT JOIN users u ON mp.participant_user_id = u.user_id
       LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
       WHERE mp.meeting_id = $1 AND f.employee_id = $2`,
      [id, participant_id]
    );

    if (existingParticipant.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Participant already added to meeting' });
    }

    // Get participant details
    const facultyQuery = await pool.query(
      'SELECT f.name, f.email, u.user_id FROM faculty f LEFT JOIN users u ON u.faculty_id = f.faculty_id WHERE f.employee_id = $1',
      [participant_id]
    );

    if (facultyQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty member not found' });
    }

    const faculty = facultyQuery.rows[0];

    // Add participant
    const insertQuery = `
      INSERT INTO meeting_participants (meeting_id, participant_user_id, participant_name, participant_email, availability_status, is_required)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      id,
      faculty.user_id,
      faculty.name,
      faculty.email,
      participation_type === 'required'
    ]);

    // Get participant details
    const participantDetails = await pool.query(
      `SELECT
        mp.*,
        mp.participant_name as name,
        f.designation,
        mp.participant_email as email
      FROM meeting_participants mp
      LEFT JOIN users u ON mp.participant_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      WHERE mp.meeting_id = $1 AND mp.participant_id = $2`,
      [id, result.rows[0].participant_id]
    );

    res.status(201).json({
      success: true,
      data: participantDetails.rows[0]
    });

  } catch (error) {
    logger.error('Error adding participant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove participant from meeting
 * DELETE /api/meetings/:id/participants/:participantId
 */
const removeParticipant = async (req, res) => {
  const { id, participantId } = req.params;

  try {
    // Check permissions
    const meetingResult = await pool.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    if (meeting.requester_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only meeting creator or admin can remove participants' });
    }

    // Remove participant (find by faculty employee_id)
    const deleteResult = await pool.query(
      `DELETE FROM meeting_participants mp
       WHERE mp.meeting_id = $1 AND mp.participant_user_id IN (
         SELECT u.user_id FROM users u
         JOIN faculty f ON u.faculty_id = f.faculty_id
         WHERE f.employee_id = $2
       )`,
      [id, participantId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Participant not found in meeting' });
    }

    res.json({ success: true, message: 'Participant removed successfully' });

  } catch (error) {
    logger.error('Error removing participant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFacultyForInvitation,
  getMeetingParticipants,
  addParticipant,
  removeParticipant,
};
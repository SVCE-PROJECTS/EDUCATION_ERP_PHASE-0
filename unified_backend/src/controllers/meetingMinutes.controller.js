/**
 * Meeting Minutes Controller
 * Handles meeting minutes and action items
 */

const pool = require('../config/db').pool;
const { logger } = require('../utils/logger');

/**
 * Create or update meeting minutes
 * POST /api/meetings/:id/minutes
 */
const saveMinutes = async (req, res) => {
  const { id } = req.params;
  const { content, attendees = [] } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check meeting access and status
    const meetingResult = await client.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Only meeting creator or admin can create minutes
    if (meeting.requester_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if minutes already exist
    const existingMinutes = await client.query(
      `SELECT minutes_id FROM meeting_minutes WHERE meeting_id = $1`,
      [id]
    );

    let minutesResult;

    if (existingMinutes.rows.length > 0) {
      // Update existing minutes
      minutesResult = await client.query(
        `UPDATE meeting_minutes
         SET summary = $1, last_updated_by_user_id = $2, updated_at = NOW()
         WHERE meeting_id = $3
         RETURNING *`,
        [content, req.user.id, id]
      );
    } else {
      // Create new minutes
      minutesResult = await client.query(
        `INSERT INTO meeting_minutes (meeting_id, summary, recorded_by_user_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [id, content, req.user.id]
      );
    }

    // Update attendees if provided
    if (attendees.length > 0) {
      // Mark participants as attended/absent
      const attendeeList = attendees.map(a => a.participant_id).join(',');

      // Mark all as absent first
      await client.query(
        `UPDATE meeting_participants
         SET attendance_status = 'absent'
         WHERE meeting_id = $1`,
        [id]
      );

      // Mark attendees as present
      for (const attendee of attendees) {
        await client.query(
          `UPDATE meeting_participants
           SET availability_status = $1
           WHERE meeting_id = $2 AND participant_user_id = (
             SELECT user_id FROM users u
             JOIN faculty f ON u.faculty_id = f.faculty_id
             WHERE f.employee_id = $3
           )`,
          [attendee.status || 'available', id, attendee.participant_id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: minutesResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error saving meeting minutes:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Get meeting minutes
 * GET /api/meetings/:id/minutes
 */
const getMinutes = async (req, res) => {
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

    // Get minutes with creator info
    const minutesQuery = `
      SELECT
        mm.*,
        cf.name as created_by_name,
        ef.name as edited_by_name
      FROM meeting_minutes mm
      LEFT JOIN users cu ON mm.recorded_by_user_id = cu.user_id
      LEFT JOIN faculty cf ON cu.faculty_id = cf.faculty_id
      LEFT JOIN users eu ON mm.last_updated_by_user_id = eu.user_id
      LEFT JOIN faculty ef ON eu.faculty_id = ef.faculty_id
      WHERE mm.meeting_id = $1
    `;

    const minutesResult = await pool.query(minutesQuery, [id]);

    // Get attendees
    const attendeesQuery = `
      SELECT
        mp.participant_id,
        mp.availability_status,
        mp.participant_name,
        f.designation,
        mp.participant_email as email
      FROM meeting_participants mp
      LEFT JOIN users u ON mp.participant_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      WHERE mp.meeting_id = $1
      ORDER BY mp.participant_name
    `;

    const attendeesResult = await pool.query(attendeesQuery, [id]);

    res.json({
      success: true,
      data: {
        minutes: minutesResult.rows[0] || null,
        attendees: attendeesResult.rows
      }
    });

  } catch (error) {
    logger.error('Error fetching meeting minutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create action item
 * POST /api/meetings/:id/action-items
 */
const createActionItem = async (req, res) => {
  const { id } = req.params;
  const { description, assigned_to, due_date, priority = 'medium' } = req.body;

  if (!description || !assigned_to) {
    return res.status(400).json({
      success: false,
      message: 'Description and assigned_to are required'
    });
  }

  try {
    // Check meeting access
    const meetingResult = await pool.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Only meeting creator or admin can create action items
    if (meeting.requester_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Insert action item
    const actionItemQuery = `
      INSERT INTO meeting_action_items (
        meeting_id, description, assigned_to_user_id, assignee_name, due_date, priority, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    // Get assignee details
    const assigneeResult = await pool.query(
      `SELECT u.user_id, f.name, f.email FROM users u
       JOIN faculty f ON u.faculty_id = f.faculty_id
       WHERE f.employee_id = $1`,
      [assigned_to]
    );

    if (assigneeResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Assigned user not found' });
    }

    const assignee = assigneeResult.rows[0];

    const result = await pool.query(actionItemQuery, [
      id, description, assignee.user_id, assignee.name, due_date, priority, req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        assigned_to_name: assignee.name,
        assigned_to_email: assignee.email
      }
    });

  } catch (error) {
    logger.error('Error creating action item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get action items for meeting
 * GET /api/meetings/:id/action-items
 */
const getActionItems = async (req, res) => {
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

    // Get action items
    const actionItemsQuery = `
      SELECT
        mai.*,
        mai.assignee_name as assigned_to_name,
        af.designation as assigned_to_designation,
        af.email as assigned_to_email,
        cf.name as created_by_name
      FROM meeting_action_items mai
      LEFT JOIN users au ON mai.assigned_to_user_id = au.user_id
      LEFT JOIN faculty af ON au.faculty_id = af.faculty_id
      LEFT JOIN users cu ON mai.created_by_user_id = cu.user_id
      LEFT JOIN faculty cf ON cu.faculty_id = cf.faculty_id
      WHERE mai.meeting_id = $1
      ORDER BY mai.due_date ASC, mai.created_at DESC
    `;

    const result = await pool.query(actionItemsQuery, [id]);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        due_date: row.due_date?.toISOString().split('T')[0]
      }))
    });

  } catch (error) {
    logger.error('Error fetching action items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update action item status
 * PUT /api/meetings/:meetingId/action-items/:itemId
 */
const updateActionItem = async (req, res) => {
  const { meetingId, itemId } = req.params;
  const { status, progress_notes, completion_date } = req.body;

  try {
    // Get action item and check permissions
    const actionItemResult = await pool.query(
      `SELECT mai.*, m.requester_user_id as meeting_creator
       FROM meeting_action_items mai
       JOIN meetings m ON mai.meeting_id = m.meeting_id
       WHERE mai.action_id = $1 AND mai.meeting_id = $2`,
      [itemId, meetingId]
    );

    if (actionItemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Action item not found' });
    }

    const actionItem = actionItemResult.rows[0];

    // Only assignee, meeting creator, or admin can update
    if (actionItem.assigned_to_user_id !== req.user.id &&
        actionItem.meeting_creator !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update action item
    const updateQuery = `
      UPDATE meeting_action_items
      SET status = COALESCE($1, status),
          progress_notes = COALESCE($2, progress_notes),
          completion_notes = COALESCE($3, completion_notes),
          completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
          updated_at = NOW(),
          updated_by_user_id = $5
      WHERE action_id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [status, progress_notes, completion_date, itemId, req.user.id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        due_date: result.rows[0].due_date?.toISOString().split('T')[0],
        completed_at: result.rows[0].completed_at?.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    logger.error('Error updating action item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  saveMinutes,
  getMinutes,
  createActionItem,
  getActionItems,
  updateActionItem,
};
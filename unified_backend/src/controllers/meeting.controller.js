/**
 * Meeting Management Controller
 * Handles all meeting-related operations with role-based permissions
 *
 * Role hierarchy: Admin -> HOD -> Faculty
 * - Admin: Can create meetings for any department, no approval needed
 * - HOD: Can create meetings for their department, requires approval from admin
 * - Faculty: Can create meetings for their department, requires approval from HOD->Admin
 */

const pool = require('../config/db').pool;
const { ApiError } = require('../utils/response');
const { logger } = require('../utils/logger');

const getMeetingRole = (user) => {
  if (user.role === 'admin' || user.isAdmin) return 'admin';
  if (user.role === 'hod' || user.isHOD || user.roles?.includes('HOD')) return 'hod';
  return 'faculty';
};

const getMeetingUserId = async (db, user) => {
  if (getMeetingRole(user) === 'admin') return user.id;
  const result = await db.query(
    `SELECT u.user_id FROM users u
     JOIN faculty f ON u.faculty_id = f.faculty_id
     WHERE f.employee_id::text = $1::text`,
    [user.id]
  );
  return result.rows[0]?.user_id ?? null;
};

const formatMeetingDate = (value) => {
  if (!value) return value;
  if (typeof value === 'string') return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

/**
 * Get meetings with role-based filtering
 * GET /api/meetings?status=pending&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
const getMeetings = async (req, res) => {
  const { status, from, to, department_code, meeting_type } = req.query;
  const role = getMeetingRole(req.user);

  try {
    const conditions = [];
    const params = [];
    let employeeIdParam = null;

    // Role-based filtering with proper user ID mapping
    if (role === 'admin') {
      // Admin can see all meetings
      if (department_code) {
        params.push(department_code);
        conditions.push('d.department_code = $' + params.length);
      }
    } else {
      // HOD and Faculty can only see their department's meetings
      params.push(req.user.departmentCode);
      conditions.push('d.department_code = $' + params.length);
    }

    // Add participant/creator filtering for non-admin users
    if (role !== 'admin') {
      // Faculty and HOD JWTs identify users by employee_id, while meeting
      // ownership and participant relations store the linked users.user_id.
      employeeIdParam = params.length + 1;
      const userConditions = [
        `m.requester_user_id IN (
          SELECT u.user_id FROM users u
          JOIN faculty f ON u.faculty_id = f.faculty_id
          WHERE f.employee_id::text = $${employeeIdParam}::text
        )`,
        `EXISTS (
          SELECT 1 FROM meeting_participants mp
          WHERE mp.meeting_id = m.meeting_id
          AND (
            mp.participant_user_id IN (
              SELECT u.user_id FROM users u
              JOIN faculty f ON u.faculty_id = f.faculty_id
              WHERE f.employee_id::text = $${employeeIdParam}::text
            )
            OR LOWER(mp.participant_email) = LOWER((
              SELECT f.email FROM faculty f
              WHERE f.employee_id::text = $${employeeIdParam}::text
            ))
          )
        )`,
      ];

      if (role === 'hod') {
        userConditions.push(`EXISTS (
          SELECT 1 FROM meeting_approvals ma
          WHERE ma.meeting_id = m.meeting_id
            AND ma.approval_status = 'pending'
            AND ma.approver_user_id IN (
              SELECT u.user_id FROM users u
              JOIN faculty f ON u.faculty_id = f.faculty_id
              WHERE f.employee_id::text = $${employeeIdParam}::text
            )
        )`);
      }

      params.push(req.user.id);
      conditions.push('(' + userConditions.join(' OR ') + ')');
    }

    // Status filter - handle both database and frontend status values
    if (status && status !== 'all') {
      // Map frontend status to database status if needed
      let dbStatus = status;
      if (status === 'pending_approval') {
        // Frontend requests 'pending_approval', map to database 'pending_availability'
        dbStatus = 'pending_availability';
      }

      params.push(dbStatus);
      conditions.push('m.status = $' + params.length);
    }

    // Date range filters
    if (from) {
      params.push(from);
      conditions.push('m.meeting_date >= $' + params.length);
    }
    if (to) {
      params.push(to);
      conditions.push('m.meeting_date <= $' + params.length);
    }

    if (meeting_type === 'online' || meeting_type === 'offline') {
      params.push(meeting_type);
      conditions.push('m.meeting_type = $' + params.length);
    }

    // Exclude soft-deleted meetings
    conditions.push("m.status != 'deleted'");

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const userPendingApprovalsSelect = role === 'admin'
      ? '0 as user_pending_approvals'
      : `(SELECT COUNT(*) FROM meeting_approvals ma
          WHERE ma.meeting_id = m.meeting_id
            AND ma.approval_status = 'pending'
            AND ma.approver_user_id IN (
              SELECT u.user_id FROM users u
              JOIN faculty f ON u.faculty_id = f.faculty_id
              WHERE f.employee_id::text = $${employeeIdParam}::text
            )) as user_pending_approvals`;

    const query = `
      SELECT
        m.meeting_id,
        m.title,
        m.agenda as description,
        d.department_code,
        m.meeting_date as scheduled_date,
        m.start_time,
        m.duration_minutes,
        m.location,
        COALESCE(m.meeting_type, 'online') as meeting_type,
        m.meeting_url,
        m.status,
        CASE
          WHEN m.requester_user_id IN (SELECT user_id FROM users WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'admin'))
          THEN false
          ELSE true
        END as approval_required,
        m.requester_user_id as created_by,
        m.created_at,
        m.updated_at,
        f.name as created_by_name,
        f.designation as created_by_designation,
        f.employee_id as created_by_employee_id,
        -- Count participants
        (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.meeting_id) as participant_count,
        -- Count pending approvals
        (SELECT COUNT(*) FROM meeting_approvals ma WHERE ma.meeting_id = m.meeting_id AND ma.approval_status = 'pending') as pending_approvals,
        ${userPendingApprovalsSelect}
      FROM meetings m
      LEFT JOIN users u ON m.requester_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      LEFT JOIN departments d ON m.department_id = d.department_id
      ${whereClause}
      ORDER BY m.meeting_date DESC, m.start_time DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        scheduled_date: formatMeetingDate(row.scheduled_date),
        start_time: row.start_time?.substring(0, 5), // HH:MM format
        meeting_type: row.meeting_type || 'online',
        // Map status values to frontend expectations
        status: row.status === 'pending_availability' ? 'pending_approval' : row.status
      }))
    });

  } catch (error) {
    logger.error('Error fetching meetings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single meeting details with participants and approvals
 * GET /api/meetings/:id
 */
const getMeetingById = async (req, res) => {
  const { id } = req.params;
  const role = getMeetingRole(req.user);

  try {
    // Check access permissions
    const meetingQuery = `
      SELECT
        m.*,
        m.agenda as description,
        m.meeting_date as scheduled_date,
        d.department_code,
        f.name as created_by_name,
        f.designation as created_by_designation,
        f.employee_id as created_by_employee_id
      FROM meetings m
      LEFT JOIN users u ON m.requester_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      LEFT JOIN departments d ON m.department_id = d.department_id
      WHERE m.meeting_id = $1 AND m.status != 'deleted'
    `;

    const meetingResult = await pool.query(meetingQuery, [id]);

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Role-based access control
    if (role !== 'admin' && meeting.department_code !== req.user.departmentCode) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get participants
    const participantsQuery = `
      SELECT
        mp.*,
        mp.participant_name,
        mp.participant_email as email,
        COALESCE(f.employee_id, (
          SELECT matched_faculty.employee_id FROM faculty matched_faculty
          WHERE LOWER(matched_faculty.email) = LOWER(mp.participant_email)
          LIMIT 1
        )) as participant_employee_id,
        f.designation
      FROM meeting_participants mp
      LEFT JOIN users u ON mp.participant_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      WHERE mp.meeting_id = $1
      ORDER BY mp.participant_name
    `;

    // Get approvals
    const approvalsQuery = `
      SELECT
        ma.*,
        ma.approver_name,
        f.employee_id as approver_employee_id,
        f.designation as approver_designation
      FROM meeting_approvals ma
      LEFT JOIN users u ON ma.approver_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      WHERE ma.meeting_id = $1
      ORDER BY ma.required_at
    `;

    // Get documents
    const documentsQuery = `
      SELECT
        md.*,
        f.name as uploaded_by_name
      FROM meeting_documents md
      LEFT JOIN users u ON md.uploaded_by_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      WHERE md.meeting_id = $1
      ORDER BY md.uploaded_at DESC
    `;

    const [participantsResult, approvalsResult, documentsResult] = await Promise.all([
      pool.query(participantsQuery, [id]),
      pool.query(approvalsQuery, [id]),
      pool.query(documentsQuery, [id])
    ]);

    res.json({
      success: true,
      data: {
        ...meeting,
        scheduled_date: formatMeetingDate(meeting.scheduled_date),
        start_time: meeting.start_time?.substring(0, 5),
        // Map status values to frontend expectations
        status: meeting.status === 'pending_availability' ? 'pending_approval' : meeting.status,
        participants: participantsResult.rows,
        approvals: approvalsResult.rows,
        documents: documentsResult.rows
      }
    });

  } catch (error) {
    logger.error('Error fetching meeting details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create new meeting
 * POST /api/meetings
 */
const createMeeting = async (req, res) => {
  const {
    title,
    description,
    scheduled_date,
    start_time,
    duration_minutes,
    location,
    meeting_type = 'online',
    participant_ids = []
  } = req.body;
  const role = getMeetingRole(req.user);
  const isOffline = meeting_type === 'offline';

  if (!['online', 'offline'].includes(meeting_type)) {
    return res.status(400).json({ success: false, message: 'meeting_type must be online or offline' });
  }

  if (!title || !scheduled_date || !start_time || (!isOffline && !duration_minutes) || (isOffline && !location?.trim())) {
    return res.status(400).json({
      success: false,
      message: isOffline
        ? 'Title, scheduled_date, start_time, and venue are required'
        : 'Title, scheduled_date, start_time, and duration_minutes are required'
    });
  }

  if (duration_minutes != null && (!Number.isInteger(Number(duration_minutes)) || Number(duration_minutes) <= 0 || Number(duration_minutes) > 480)) {
    return res.status(400).json({ success: false, message: 'Duration must be between 1 and 480 minutes' });
  }
  if (!Array.isArray(participant_ids)) {
    return res.status(400).json({ success: false, message: 'participant_ids must be an array' });
  }

  const uniqueParticipantIds = [...new Set(participant_ids.map(String).filter(Boolean))];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get department_id from user's department or from request
    let department_id;

    if (req.user.departmentCode) {
      // User has department code - use it
      const deptQuery = await client.query(
        'SELECT department_id FROM departments WHERE department_code = $1',
        [req.user.departmentCode]
      );

      if (deptQuery.rows.length === 0) {
        throw new Error(`Department not found for code: ${req.user.departmentCode}`);
      }

      department_id = deptQuery.rows[0].department_id;
    } else if (req.user.faculty_id) {
      // User doesn't have departmentCode but has faculty_id - get from faculty record
      const facultyDeptQuery = await client.query(
        'SELECT department_id FROM faculty WHERE faculty_id = $1',
        [req.user.faculty_id]
      );

      if (facultyDeptQuery.rows.length === 0) {
        throw new Error('Faculty department not found');
      }

      department_id = facultyDeptQuery.rows[0].department_id;
    } else {
      // Admin user - use first available department as fallback
      const defaultDeptQuery = await client.query(
        'SELECT department_id FROM departments WHERE is_active = true ORDER BY department_id LIMIT 1'
      );

      if (defaultDeptQuery.rows.length === 0) {
        throw new Error('No active departments found');
      }

      department_id = defaultDeptQuery.rows[0].department_id;
    }

    // Offline meetings are informational and have no video URL.
    const meetingRoomId = `svce-meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const meeting_url = isOffline ? null : `https://meet.jit.si/${meetingRoomId}`;

    // Get or create user_id for the requester
    let requester_user_id;

    if (role === 'admin') {
      // Admin user - use their existing user_id directly
      requester_user_id = parseInt(req.user.id);
    } else {
      // Faculty user - req.user.id contains employee_id, need to find/create corresponding user_id
      const employee_id = req.user.id;

      // First try to find existing user record linked to this faculty
      const existingUserQuery = await client.query(
        'SELECT u.user_id FROM users u JOIN faculty f ON u.faculty_id = f.faculty_id WHERE f.employee_id = $1',
        [employee_id]
      );

      if (existingUserQuery.rows.length > 0) {
        requester_user_id = existingUserQuery.rows[0].user_id;
      } else {
        // No user record exists for this faculty member - create one
        const facultyQuery = await client.query(
          'SELECT faculty_id, name, email, username FROM faculty WHERE employee_id = $1',
          [employee_id]
        );

        if (facultyQuery.rows.length === 0) {
          throw new Error(`Faculty not found for employee ID: ${employee_id}`);
        }

        const faculty = facultyQuery.rows[0];

        // Create user record for this faculty member
        const createUserQuery = await client.query(
          `INSERT INTO users (username, email, password_hash, faculty_id, role_id, status)
           VALUES ($1, $2, 'faculty_placeholder', $3, 4, 'active')
           RETURNING user_id`,
          [faculty.username || employee_id, faculty.email, faculty.faculty_id]
        );

        requester_user_id = createUserQuery.rows[0].user_id;
      }
    }

    if (role === 'admin' && uniqueParticipantIds.length > 0) {
      const participantDepartments = await client.query(
        `SELECT DISTINCT department_id FROM faculty
         WHERE employee_id = ANY($1::varchar[]) AND status = 'ACTIVE'`,
        [uniqueParticipantIds]
      );
      if (participantDepartments.rows.length === 1) {
        department_id = participantDepartments.rows[0].department_id;
      } else if (participantDepartments.rows.length > 1) {
        department_id = null;
      }
    }

    // Insert meeting with correct user_id
    const meetingQuery = `
      INSERT INTO meetings (
        title, agenda, department_id, meeting_date, start_time,
        duration_minutes, meeting_url, status, requester_user_id, meeting_type, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    // Determine initial status based on role
    const status = isOffline || role === 'admin' ? 'confirmed' : 'pending_availability';

    const meetingResult = await client.query(meetingQuery, [
      title,
      description,
      department_id,
      scheduled_date,
      start_time,
      duration_minutes,
      meeting_url,
      status,
      requester_user_id,
      meeting_type,
      isOffline ? location.trim() : (location?.trim() || null)
    ]);

    const meeting = meetingResult.rows[0];

    // Add participants
    if (uniqueParticipantIds.length > 0) {
      for (const participantId of uniqueParticipantIds) {
        // Get participant details
        const participantQuery = await client.query(
          `SELECT f.name, f.email, f.employee_id, f.department_id, u.user_id
           FROM faculty f
           LEFT JOIN users u ON u.faculty_id = f.faculty_id
           WHERE f.employee_id = $1 AND f.status = 'ACTIVE'`,
          [participantId]
        );

        if (participantQuery.rows.length === 0) {
          throw new Error(`Selected participant ${participantId} is unavailable`);
        }

        const participant = participantQuery.rows[0];
        if (role !== 'admin' && String(participant.department_id) !== String(department_id)) {
          const error = new Error('You can only invite faculty from your department');
          error.statusCode = 403;
          throw error;
        }

        await client.query(
          `INSERT INTO meeting_participants
           (meeting_id, participant_user_id, participant_name, participant_email, availability_status, is_required)
           VALUES ($1, $2, $3, $4, 'pending', true)`,
          [meeting.meeting_id, participant.user_id, participant.name, participant.email]
        );

        if (isOffline) {
          const creatorResult = await client.query(
            `SELECT COALESCE(f.name, u.username) as name, f.designation
             FROM users u LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
             WHERE u.user_id = $1`,
            [requester_user_id]
          );
          const creatorName = creatorResult.rows[0]?.name || req.user.username || 'A user';
          const creatorRole = role === 'admin' ? 'Admin' : role === 'hod' ? 'HOD' : 'Faculty';
          const durationText = duration_minutes ? ` for ${duration_minutes} minutes` : '';
          const message = `${creatorName} (${creatorRole}) has arranged an offline meeting: ${title.trim()}, on ${scheduled_date} at ${start_time}${durationText}, at ${location.trim()}.${description?.trim() ? ` ${description.trim()}` : ''}`;

          await client.query(
            `INSERT INTO meeting_notifications
               (meeting_id, recipient_user_id, recipient_employee_id, notification_type, message)
             VALUES ($1, $2, $3, 'offline_meeting_arranged', $4)
             ON CONFLICT DO NOTHING`,
            [meeting.meeting_id, participant.user_id, participant.employee_id, message]
          );
        }
      }
    }

    // Create approval workflow if needed (non-admin users need approval)
    if (!isOffline && role !== 'admin') {
      if (role === 'faculty') {
        // Faculty -> HOD approval
        const hodQuery = `
          SELECT u.user_id, f.name FROM faculty f
          JOIN users u ON u.faculty_id = f.faculty_id
          WHERE f.department_id = $1 AND f.is_hod = true AND f.status = 'ACTIVE'
          LIMIT 1
        `;
        const hodResult = await client.query(hodQuery, [department_id]);

        if (hodResult.rows.length > 0) {
          await client.query(
            `INSERT INTO meeting_approvals (meeting_id, approver_user_id, approver_name, approval_status)
             VALUES ($1, $2, $3, 'pending')`,
            [meeting.meeting_id, hodResult.rows[0].user_id, hodResult.rows[0].name]
          );
        }
      } else if (role === 'hod') {
        // HOD -> Admin approval
        const adminQuery = await client.query(
          `SELECT u.user_id FROM users u
           JOIN roles r ON u.role_id = r.role_id
           WHERE r.role_name = 'admin' LIMIT 1`
        );

        if (adminQuery.rows.length > 0) {
          await client.query(
            `INSERT INTO meeting_approvals (meeting_id, approver_user_id, approver_name, approval_status)
             VALUES ($1, $2, 'Admin', 'pending')`,
            [meeting.meeting_id, adminQuery.rows[0].user_id]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Fetch complete meeting data to return
    const completeResult = await pool.query(
      `SELECT m.*, m.agenda as description, m.meeting_date as scheduled_date,
              d.department_code, f.name as created_by_name
       FROM meetings m
       LEFT JOIN users u ON m.requester_user_id = u.user_id
       LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
       LEFT JOIN departments d ON m.department_id = d.department_id
       WHERE m.meeting_id = $1`,
      [meeting.meeting_id]
    );

    res.status(201).json({
      success: true,
      data: {
        ...completeResult.rows[0],
        scheduled_date: formatMeetingDate(completeResult.rows[0].scheduled_date),
        start_time: completeResult.rows[0].start_time?.substring(0, 5),
        // Map status values to frontend expectations
        status: completeResult.rows[0].status === 'pending_availability' ? 'pending_approval' : completeResult.rows[0].status,
        meeting_type,
        approval_required: !isOffline && role !== 'admin'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating meeting:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Update meeting
 * PUT /api/meetings/:id
 */
const updateMeeting = async (req, res) => {
  const { id } = req.params;
  const role = getMeetingRole(req.user);
  const {
    title,
    description,
    scheduled_date,
    start_time,
    duration_minutes,
    location,
    participant_ids = []
  } = req.body;

  if (!title || !scheduled_date || !start_time || !duration_minutes) {
    return res.status(400).json({
      success: false,
      message: 'Title, scheduled_date, start_time, and duration_minutes are required'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check permissions
    const meetingCheck = await client.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingCheck.rows[0];

    // Permission check: only creator or admin can edit
    const requesterUserId = await getMeetingUserId(client, req.user);
    const hasPermission = role === 'admin' || (
      requesterUserId !== null && String(requesterUserId) === String(meeting.requester_user_id)
    );

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Don't allow editing if meeting is in progress or completed
    if (['in_progress', 'completed', 'cancelled'].includes(meeting.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit meeting in current status'
      });
    }

    // Update meeting
    const updateQuery = `
      UPDATE meetings
      SET title = $1, agenda = $2, meeting_date = $3, start_time = $4,
          duration_minutes = $5, location = $6, updated_at = NOW()
      WHERE meeting_id = $7
      RETURNING *, agenda as description, meeting_date as scheduled_date
    `;

    const updateResult = await client.query(updateQuery, [
      title, description, scheduled_date, start_time, duration_minutes, location || null, id
    ]);

    // Update participants if provided
    if (participant_ids.length >= 0) { // Allow empty array to clear participants
      // Remove existing participants
      await client.query('DELETE FROM meeting_participants WHERE meeting_id = $1', [id]);

      // Add new participants
      if (participant_ids.length > 0) {
        for (const participantId of participant_ids) {
          // Get participant details
          const participantQuery = await client.query(
            'SELECT f.name, f.email FROM faculty f WHERE f.employee_id = $1',
            [participantId]
          );

          if (participantQuery.rows.length > 0) {
            const participant = participantQuery.rows[0];

            // Get user_id if exists
            const userQuery = await client.query(
              'SELECT user_id FROM users WHERE faculty_id = (SELECT faculty_id FROM faculty WHERE employee_id = $1)',
              [participantId]
            );

            await client.query(
              `INSERT INTO meeting_participants
               (meeting_id, participant_user_id, participant_name, participant_email, availability_status, is_required)
               VALUES ($1, $2, $3, $4, 'pending', true)`,
              [
                id,
                userQuery.rows[0]?.user_id || null,
                participant.name,
                participant.email
              ]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        ...updateResult.rows[0],
        scheduled_date: formatMeetingDate(updateResult.rows[0].scheduled_date),
        start_time: updateResult.rows[0].start_time?.substring(0, 5),
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating meeting:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Delete meeting (soft delete)
 * DELETE /api/meetings/:id
 */
const deleteMeeting = async (req, res) => {
  const { id } = req.params;
  const role = getMeetingRole(req.user);

  try {
    // Check permissions
    const meetingCheck = await pool.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingCheck.rows[0];

    // Permission check: only creator or admin can delete
    const requesterUserId = await getMeetingUserId(pool, req.user);
    const hasPermission = role === 'admin' || (
      requesterUserId !== null && String(requesterUserId) === String(meeting.requester_user_id)
    );

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Soft delete
    await pool.query(
      `UPDATE meetings SET status = 'deleted', deleted_at = NOW(), updated_at = NOW() WHERE meeting_id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Meeting deleted successfully' });

  } catch (error) {
    logger.error('Error deleting meeting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve/Reject meeting
 * POST /api/meetings/:id/approve
 */
const approveMeeting = async (req, res) => {
  const { id } = req.params;
  const { action, comments } = req.body; // action: 'approve' | 'reject'
  const role = getMeetingRole(req.user);

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get meeting and check if it needs approval
    const meetingResult = await client.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Find pending approval for current user
    let approvalQuery = `
      SELECT * FROM meeting_approvals
      WHERE meeting_id = $1 AND approval_status = 'pending'
    `;
    let approvalParams = [id];

    if (role === 'admin') {
      // Admin can approve any pending approval
      approvalQuery += ` ORDER BY required_at LIMIT 1`;
    } else {
      approvalQuery += ` AND approver_user_id = $2`;
      approvalParams.push(await getMeetingUserId(client, req.user));
    }

    const approvalResult = await client.query(approvalQuery, approvalParams);

    if (approvalResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'No pending approval found for you' });
    }

    const approval = approvalResult.rows[0];

    // Update approval status
    await client.query(
      `UPDATE meeting_approvals
       SET approval_status = $1, rejection_reason = $2, approval_decision_at = NOW()
       WHERE approval_id = $3`,
      [action === 'approve' ? 'approved' : 'rejected', comments, approval.approval_id]
    );

    if (action === 'reject') {
      // If rejected, update meeting status
      await client.query(
        `UPDATE meetings SET status = 'rejected' WHERE meeting_id = $1`,
        [id]
      );
    } else {
      // If approved, check if all approvals are complete
      const pendingCount = await client.query(
        `SELECT COUNT(*) as count FROM meeting_approvals
         WHERE meeting_id = $1 AND approval_status = 'pending'`,
        [id]
      );

      if (parseInt(pendingCount.rows[0].count) === 0) {
        // All approvals complete, approve the meeting
        await client.query(
          `UPDATE meetings SET status = 'confirmed' WHERE meeting_id = $1`,
          [id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Meeting ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving meeting:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Update availability status
 * POST /api/meetings/:id/availability
 */
const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body; // status: 'available' | 'unavailable' | 'tentative'

  if (!['available', 'unavailable', 'tentative'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    // Get the proper user_id for faculty users
    const userId = await getMeetingUserId(pool, req.user);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User identification failed' });
    }

    // Check if user is a participant
    const participantResult = await pool.query(
      `SELECT * FROM meeting_participants WHERE meeting_id = $1 AND participant_user_id = $2`,
      [id, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not a participant of this meeting' });
    }

    // Update availability
    await pool.query(
      `UPDATE meeting_participants
       SET availability_status = $1, unavailable_reason = $2, availability_response_at = NOW()
       WHERE meeting_id = $3 AND participant_user_id = $4`,
      [status, comments, id, userId]
    );

    res.json({ success: true, message: 'Availability updated successfully' });

  } catch (error) {
    logger.error('Error updating availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Start meeting
 * POST /api/meetings/:id/start
 */
const startMeeting = async (req, res) => {
  const { id } = req.params;
  const role = getMeetingRole(req.user);

  try {
    // Check if user can start the meeting (creator or admin)
    const meetingResult = await pool.query(
      `SELECT * FROM meetings WHERE meeting_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    if (meeting.meeting_type === 'offline') {
      return res.status(400).json({ success: false, message: 'Offline meetings cannot be started as online calls' });
    }

    // Permission check: only creator or admin can start the meeting
    const requesterUserId = await getMeetingUserId(pool, req.user);
    const hasPermission = role === 'admin' || (
      requesterUserId !== null && String(requesterUserId) === String(meeting.requester_user_id)
    );

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Only meeting creator or admin can start the meeting' });
    }

    if (!['confirmed', 'pending_availability'].includes(meeting.status)) {
      return res.status(400).json({ success: false, message: 'Meeting must be confirmed before starting' });
    }

    // Update meeting status
    await pool.query(
      `UPDATE meetings SET status = 'in_progress', updated_at = NOW() WHERE meeting_id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Meeting started successfully',
      meeting_url: meeting.meeting_url
    });

  } catch (error) {
    logger.error('Error starting meeting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Complete meeting
 * POST /api/meetings/:id/complete
 */
const completeMeeting = async (req, res) => {
  const { id } = req.params;
  const role = getMeetingRole(req.user);

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

    // Permission check: only creator or admin can complete the meeting
    const requesterUserId = await getMeetingUserId(pool, req.user);
    const hasPermission = role === 'admin' || (
      requesterUserId !== null && String(requesterUserId) === String(meeting.requester_user_id)
    );

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Only meeting creator or admin can complete the meeting' });
    }

    if (meeting.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Meeting must be in progress to complete' });
    }

    // Update meeting status
    await pool.query(
      `UPDATE meetings SET status = 'completed', updated_at = NOW() WHERE meeting_id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Meeting completed successfully' });

  } catch (error) {
    logger.error('Error completing meeting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayMeetings = async (req, res) => {
  const today = req.query.date;
  if (today && !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return res.status(400).json({ success: false, message: 'date must use YYYY-MM-DD format' });
  }
  const localDate = today || formatMeetingDate(new Date());
  req.query = { ...req.query, from: localDate, to: localDate };
  return getMeetings(req, res);
};

const getMeetingNotifications = async (req, res) => {
  try {
    const userId = await getMeetingUserId(pool, req.user);
    const result = await pool.query(
      `SELECT n.notification_id, n.meeting_id, n.notification_type, n.message,
              n.created_at, n.read_at, m.meeting_type, m.meeting_date,
              m.start_time, m.location, m.duration_minutes, m.status
       FROM meeting_notifications n
       JOIN meetings m ON m.meeting_id = n.meeting_id
       WHERE (n.recipient_employee_id = $1 OR ($2::bigint IS NOT NULL AND n.recipient_user_id = $2))
         AND m.status != 'deleted'
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [getMeetingRole(req.user) === 'admin' ? null : req.user.id, userId]
    );
    res.json({ success: true, data: result.rows.map(row => ({
      ...row,
      scheduled_date: formatMeetingDate(row.meeting_date),
      start_time: row.start_time?.substring(0, 5),
    })) });
  } catch (error) {
    logger.error('Error fetching meeting notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const markMeetingNotificationRead = async (req, res) => {
  try {
    const userId = await getMeetingUserId(pool, req.user);
    const recipientEmployeeId = getMeetingRole(req.user) === 'admin' ? null : req.user.id;
    const result = await pool.query(
      `UPDATE meeting_notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE notification_id = $1
         AND (recipient_employee_id = $2 OR ($3::bigint IS NOT NULL AND recipient_user_id = $3))
       RETURNING notification_id, read_at`,
      [req.params.notificationId, recipientEmployeeId, userId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error marking meeting notification read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMeetings,
  getTodayMeetings,
  getMeetingNotifications,
  markMeetingNotificationRead,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  approveMeeting,
  updateAvailability,
  startMeeting,
  completeMeeting,
};
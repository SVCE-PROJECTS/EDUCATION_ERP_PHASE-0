/**
 * Schedules Controller
 * Personal calendar/schedule management for users
 *
 * PRIVACY: All operations are scoped to req.user.id from the verified auth token.
 * Users can only see/modify their own schedules.
 */

const pool = require('../config/db').pool;

// GET /api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD
const getSchedules = async (req, res) => {
  const { from, to } = req.query;

  try {
    const conditions = ['user_id = $1'];
    const params = [req.user.id];

    if (from) {
      params.push(from);
      conditions.push('date >= $' + params.length);
    }
    if (to) {
      params.push(to);
      conditions.push('date <= $' + params.length);
    }

    const where = conditions.join(' AND ');

    const result = await pool.query(
      'SELECT schedule_id AS id, user_id, user_role,' +
      '       title, description,' +
      "       TO_CHAR(date, 'YYYY-MM-DD') AS date," +
      "       TO_CHAR(start_time, 'HH24:MI') AS time," +
      '       status, created_at, updated_at' +
      ' FROM schedules' +
      ' WHERE ' + where +
      ' ORDER BY date ASC, start_time ASC NULLS LAST',
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/schedules
const createSchedule = async (req, res) => {
  const { title, description, date, start_time } = req.body;

  if (!title || !date) {
    return res.status(400).json({ message: 'title and date are required.' });
  }

  try {
    // Determine user role from token
    const userRole = req.user.isAdmin ? 'admin' : (req.user.isHOD ? 'hod' : 'faculty');

    const result = await pool.query(
      "INSERT INTO schedules (user_id, user_role, title, description, date, start_time, status)" +
      " VALUES ($1, $2, $3, $4, $5, $6, 'pending')" +
      ' RETURNING schedule_id AS id, user_id, user_role, title, description,' +
      "           TO_CHAR(date, 'YYYY-MM-DD') AS date," +
      "           TO_CHAR(start_time, 'HH24:MI') AS time," +
      '           status, created_at, updated_at',
      [req.user.id, userRole, title, description || null, date, start_time || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating schedule:', err);
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/schedules/:id
const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { title, description, date, start_time, status } = req.body;

  if (!title || !date) {
    return res.status(400).json({ message: 'title and date are required.' });
  }

  try {
    const check = await pool.query(
      'SELECT schedule_id FROM schedules WHERE schedule_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found or access denied.' });
    }

    const result = await pool.query(
      'UPDATE schedules' +
      ' SET title = $1, description = $2, date = $3, start_time = $4, status = $5' +
      ' WHERE schedule_id = $6 AND user_id = $7' +
      ' RETURNING schedule_id AS id, user_id, user_role, title, description,' +
      "           TO_CHAR(date, 'YYYY-MM-DD') AS date," +
      "           TO_CHAR(start_time, 'HH24:MI') AS time," +
      '           status, created_at, updated_at',
      [title, description || null, date, start_time || null, status || 'pending', id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/schedules/:id/complete
const completeSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const check = await pool.query(
      'SELECT schedule_id FROM schedules WHERE schedule_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found or access denied.' });
    }

    const result = await pool.query(
      "UPDATE schedules SET status = 'completed'" +
      ' WHERE schedule_id = $1 AND user_id = $2' +
      ' RETURNING schedule_id AS id, user_id, user_role, title, description,' +
      "           TO_CHAR(date, 'YYYY-MM-DD') AS date," +
      "           TO_CHAR(start_time, 'HH24:MI') AS time," +
      '           status, created_at, updated_at',
      [id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error completing schedule:', err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/schedules/:id/pending
const markPendingSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const check = await pool.query(
      'SELECT schedule_id FROM schedules WHERE schedule_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found or access denied.' });
    }

    const result = await pool.query(
      "UPDATE schedules SET status = 'pending'" +
      ' WHERE schedule_id = $1 AND user_id = $2' +
      ' RETURNING schedule_id AS id, user_id, user_role, title, description,' +
      "           TO_CHAR(date, 'YYYY-MM-DD') AS date," +
      "           TO_CHAR(start_time, 'HH24:MI') AS time," +
      '           status, created_at, updated_at',
      [id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marking schedule as pending:', err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/schedules/:id
const deleteSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const check = await pool.query(
      'SELECT schedule_id FROM schedules WHERE schedule_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found or access denied.' });
    }

    await pool.query(
      'DELETE FROM schedules WHERE schedule_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Schedule deleted successfully.' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  completeSchedule,
  markPendingSchedule,
  deleteSchedule,
};

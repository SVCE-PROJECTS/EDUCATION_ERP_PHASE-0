/**
 * Attendance Controller
 * Updated to match unified_schema.sql:
 *   attendance(attendance_id, student_id, class_id, attendance_date,
 *              status CHECK('Present','Absent'), remarks, created_at)
 *   UNIQUE (student_id, class_id, attendance_date)
 *
 * No standalone subject column — subject is derived via class_id JOIN
 */

const pool = require('../config/db').pool;

// GET /attendance?class_id=X&date=YYYY-MM-DD
const getAttendance = async (req, res) => {
  const { class_id, date, student_id } = req.query;
  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (class_id)   { conditions.push(`a.class_id   = $${idx++}`); params.push(class_id); }
    if (date)       { conditions.push(`a.attendance_date = $${idx++}`); params.push(date); }
    if (student_id) { conditions.push(`a.student_id  = $${idx++}`); params.push(student_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT a.*,
              sub.subject_name, sub.subject_code
       FROM attendance a
       JOIN classes c    ON c.class_id    = a.class_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       ${where}
       ORDER BY a.attendance_date DESC`,
      params,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /attendance  — single record UPSERT
const saveAttendance = async (req, res) => {
  const { student_id, class_id, attendance_date, status, remarks } = req.body;

  if (!student_id || !class_id || !attendance_date || !status) {
    return res.status(400).json({ message: 'student_id, class_id, attendance_date, and status are required.' });
  }
  if (!['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ message: 'status must be Present or Absent.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, class_id, attendance_date)
       DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks
       RETURNING *`,
      [student_id, class_id, attendance_date, status, remarks || null],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /attendance/bulk  — array of records
const saveAttendanceBulk = async (req, res) => {
  const { records } = req.body;

  if (!Array.isArray(records) || !records.length) {
    return res.status(400).json({ message: 'records array is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, class_id, attendance_date)
         DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks`,
        [r.student_id, r.class_id, r.attendance_date, r.status, r.remarks || null],
      );
    }
    await client.query('COMMIT');
    res.json({ message: `${records.length} attendance records saved.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAttendance, saveAttendance, saveAttendanceBulk };

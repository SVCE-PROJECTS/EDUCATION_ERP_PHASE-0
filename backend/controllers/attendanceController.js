const pool = require("../config/db");

// ===============================
// Get Attendance
// Query params: ?subject=DBMS&date=2024-01-01
// Returns attendance for ALL students for that subject+date,
// with status defaulting to 'Present' for students with no record.
// ===============================
const getAttendance = async (req, res) => {
  try {
    const { subject, date } = req.query;

    // If subject + date provided: return per-student status for that session
    if (subject && date) {
      const result = await pool.query(
        `SELECT
           s.id          AS student_id,
           s.usn,
           s.name,
           COALESCE(a.status, 'Present') AS status,
           a.id          AS attendance_id
         FROM students s
         LEFT JOIN attendance a
           ON a.student_id = s.id
           AND a.subject = $1
           AND a.attendance_date = $2
         ORDER BY s.name ASC`,
        [subject, date]
      );
      return res.json(result.rows);
    }

    // No filter: return full attendance log
    const result = await pool.query(`
      SELECT
        attendance.id,
        students.usn,
        students.name,
        attendance.student_id,
        attendance.subject,
        attendance.attendance_date,
        attendance.status
      FROM attendance
      JOIN students ON students.id = attendance.student_id
      ORDER BY attendance.attendance_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET ATTENDANCE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// Save / Update Attendance (UPSERT)
// POST /attendance  — single record
// ===============================
const saveAttendance = async (req, res) => {
  const { student_id, subject, attendance_date, status } = req.body;

  if (!student_id || !subject || !attendance_date || !status) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // UPSERT: insert or update on conflict
    const result = await pool.query(
      `INSERT INTO attendance (student_id, subject, attendance_date, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, subject, attendance_date)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING *`,
      [student_id, subject, attendance_date, status]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("SAVE ATTENDANCE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// Save Attendance Bulk
// POST /attendance/bulk  — array of records
// ===============================
const saveAttendanceBulk = async (req, res) => {
  const { records } = req.body; // [{ student_id, subject, attendance_date, status }]

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "No records provided." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (student_id, subject, attendance_date, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, subject, attendance_date)
         DO UPDATE SET status = EXCLUDED.status`,
        [r.student_id, r.subject, r.attendance_date, r.status]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Attendance saved successfully.", count: records.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("BULK ATTENDANCE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAttendance, saveAttendance, saveAttendanceBulk };

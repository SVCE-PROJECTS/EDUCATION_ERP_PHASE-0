/**
 * Attendance Controller
 * Updated to match unified_schema.sql:
 *   attendance(attendance_id, student_id, class_id, attendance_date,
 *              status CHECK('Present','Absent'), remarks, created_at)
 *   UNIQUE (student_id, class_id, attendance_date)
 *
 * No standalone subject column — subject is derived via class_id JOIN
 *
 * Every endpoint here is reached with nothing more than `authenticate` — no
 * role or ownership check — so every one of them is scoped to the requesting
 * faculty's own classes (isOwnClass), except an actual admin token.
 */

const pool = require('../config/db').pool;
const { isOwnClass, ownsAllClasses } = require('../utils/classOwnership');

// GET /attendance?class_id=X&date=YYYY-MM-DD
// class_id is optional: when omitted, the result is scoped to the
// requesting faculty's own classes (or, for an admin token, to every
// class) instead of being rejected — the faculty portal's "All Classes"
// filter relies on this to load its default view.
const getAttendance = async (req, res) => {
  const { class_id, date, student_id } = req.query;

  if (class_id && !req.user.isAdmin && !(await isOwnClass(class_id, req.user.id))) {
    return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
  }

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (class_id) {
      conditions.push(`a.class_id = $${idx++}`);
      params.push(class_id);
    } else if (!req.user.isAdmin) {
      conditions.push(
        `a.class_id IN (SELECT c.class_id FROM classes c JOIN faculty f ON f.faculty_id = c.faculty_id WHERE f.employee_id = $${idx++})`,
      );
      params.push(req.user.id);
    }

    if (date)       { conditions.push(`a.attendance_date = $${idx++}`); params.push(date); }
    if (student_id) { conditions.push(`a.student_id  = $${idx++}`); params.push(student_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT a.*,
              s.name  AS student_name,
              s.usn   AS student_usn,
              sub.subject_name, sub.subject_code
       FROM attendance a
       JOIN students s   ON s.library_id  = a.student_id
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
  if (!req.user.isAdmin && !(await isOwnClass(class_id, req.user.id))) {
    return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
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

  if (!req.user.isAdmin) {
    const classIds = records.map((r) => r.class_id);
    if (!(await ownsAllClasses(classIds, req.user.id))) {
      return res.status(403).json({ message: 'Access denied. One or more classes are not assigned to you.' });
    }
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

// GET /attendance/class-statistics  — attendance % for each class of the requesting faculty
const getClassStatistics = async (req, res) => {
  try {
    // Get all classes for this faculty
    const classesResult = await pool.query(
      `SELECT c.class_id, sub.subject_name, sub.subject_code,
              sec.name AS section_name, sem.semester_number
       FROM classes c
       JOIN faculty f    ON f.faculty_id = c.faculty_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN sections sec ON sec.section_id = c.section_id
       JOIN semesters sem ON sem.semester_id = c.semester_id
       WHERE f.employee_id = $1`,
      [req.user.id]
    );

    const classes = classesResult.rows;

    // For each class, calculate attendance percentage
    const statistics = await Promise.all(
      classes.map(async (cls) => {
        const attendanceResult = await pool.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'Present') as present_count,
             COUNT(*) as total_count,
             COUNT(DISTINCT student_id) as student_count
           FROM attendance
           WHERE class_id = $1`,
          [cls.class_id]
        );

        const stats = attendanceResult.rows[0];
        const totalCount = parseInt(stats.total_count) || 0;
        const presentCount = parseInt(stats.present_count) || 0;
        const studentCount = parseInt(stats.student_count) || 0;

        const attendancePercent = totalCount > 0
          ? Math.round((presentCount / totalCount) * 100)
          : null;

        return {
          class_id: cls.class_id,
          subject_name: cls.subject_name,
          subject_code: cls.subject_code,
          semester: cls.semester_number,
          section: cls.section_name,
          attendancePercent,
          studentCount,
        };
      })
    );

    res.json(statistics);
  } catch (err) {
    console.error('Error fetching class statistics:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAttendance, saveAttendance, saveAttendanceBulk, getClassStatistics };

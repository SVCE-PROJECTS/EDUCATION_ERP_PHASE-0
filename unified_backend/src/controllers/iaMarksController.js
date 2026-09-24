/**
 * IA Marks Controller
 * Updated to match unified_schema.sql:
 *   ia_marks(ia_id, student_id, class_id, ia1, ia2, ia3,
 *            average [GENERATED STORED], created_at, updated_at)
 *
 * class_id links to classes → subjects (subject_name) and faculty
 * average is computed by the DB — never insert/update it directly
 *
 * Every endpoint here is reached with nothing more than `authenticate` — no
 * role or ownership check — so every one of them is scoped to the requesting
 * faculty's own classes (isOwnClass), except an actual admin token.
 */

const pool = require('../config/db').pool;
const { isOwnClass } = require('../utils/classOwnership');

// GET /ia-marks?student_id=X&class_id=Y
// class_id is optional: when omitted, the result is scoped to the
// requesting faculty's own classes (or, for an admin token, to every
// class) instead of being rejected — the faculty portal's "All" filter
// relies on this to load its default view.
const getIAMarks = async (req, res) => {
  const { student_id, class_id } = req.query;

  if (class_id && !req.user.isAdmin && !(await isOwnClass(class_id, req.user.id))) {
    return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
  }

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (class_id) {
      conditions.push(`im.class_id = $${idx++}`);
      params.push(class_id);
    } else if (!req.user.isAdmin) {
      conditions.push(
        `im.class_id IN (SELECT c.class_id FROM classes c JOIN faculty f ON f.faculty_id = c.faculty_id WHERE f.employee_id = $${idx++})`,
      );
      params.push(req.user.id);
    }

    if (student_id) { conditions.push(`im.student_id = $${idx++}`); params.push(student_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT im.*,
              s.name AS student_name,
              s.usn,
              sub.subject_name, sub.subject_code
       FROM ia_marks im
       JOIN students  s   ON s.library_id  = im.student_id
       JOIN classes   c   ON c.class_id    = im.class_id
       JOIN subjects sub  ON sub.subject_id = c.subject_id
       ${where}
       ORDER BY im.ia_id ASC`,
      params,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /ia-marks
const addIAMarks = async (req, res) => {
  const { student_id, class_id, ia1, ia2, ia3 } = req.body;
  if (!student_id || !class_id) {
    return res.status(400).json({ message: 'student_id and class_id are required.' });
  }
  if (!req.user.isAdmin && !(await isOwnClass(class_id, req.user.id))) {
    return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ia_marks (student_id, class_id, ia1, ia2, ia3)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, class_id)
       DO UPDATE SET ia1 = $3, ia2 = $4, ia3 = $5
       RETURNING *`,
      [student_id, class_id, ia1 ?? null, ia2 ?? null, ia3 ?? null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /ia-marks/:id
const updateIAMarks = async (req, res) => {
  const { id } = req.params;
  const { ia1, ia2, ia3 } = req.body;

  try {
    const existing = await pool.query('SELECT class_id FROM ia_marks WHERE ia_id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'IA marks not found.' });
    if (!req.user.isAdmin && !(await isOwnClass(existing.rows[0].class_id, req.user.id))) {
      return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
    }

    const result = await pool.query(
      `UPDATE ia_marks SET ia1 = $1, ia2 = $2, ia3 = $3
       WHERE ia_id = $4
       RETURNING *`,
      [ia1 ?? null, ia2 ?? null, ia3 ?? null, id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /ia-marks/:id
const deleteIAMarks = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT class_id FROM ia_marks WHERE ia_id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'IA marks not found.' });
    if (!req.user.isAdmin && !(await isOwnClass(existing.rows[0].class_id, req.user.id))) {
      return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
    }

    const result = await pool.query(
      'DELETE FROM ia_marks WHERE ia_id = $1 RETURNING ia_id',
      [id],
    );
    res.json({ message: 'IA marks deleted.', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getIAMarks, addIAMarks, updateIAMarks, deleteIAMarks };

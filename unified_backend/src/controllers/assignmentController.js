/**
 * Assignments Controller
 * Updated to match unified_schema.sql:
 *   assignments(assignment_id, class_id, title, description,
 *               due_date, marks, attachment_url, status, created_at, updated_at)
 *
 * class_id links to classes → section/semester/subject/faculty
 * No standalone subject or semester columns — all derived via class_id
 *
 * Every endpoint here is reached with nothing more than `authenticate` — no
 * role or ownership check — so every one of them is scoped to the requesting
 * faculty's own classes (isOwnClass), except an actual admin token. GET in
 * particular used to return every assignment in the school when class_id was
 * omitted — it's now always joined through the caller's own classes.
 */

const pool = require('../config/db').pool;
const { isOwnClass } = require('../utils/classOwnership');

// GET /assignments?class_id=X&status=Open
const getAssignments = async (req, res) => {
  const { class_id, status } = req.query;

  if (class_id && !req.user.isAdmin && !(await isOwnClass(class_id, req.user.id))) {
    return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
  }

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (class_id) { conditions.push(`a.class_id = $${idx++}`); params.push(class_id); }
    if (status)   { conditions.push(`a.status   = $${idx++}`); params.push(status); }

    // Not admin and no explicit class_id — scope to the caller's own classes
    // instead of returning every assignment in the school.
    let facultyJoin = '';
    if (!req.user.isAdmin) {
      facultyJoin = `JOIN faculty fac ON fac.faculty_id = c.faculty_id AND fac.employee_id = $${idx}`;
      params.push(req.user.id);
      idx += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT a.*,
              sub.subject_name, sub.subject_code,
              sec.section_name,
              sem.semester_number
       FROM assignments a
       JOIN classes c ON c.class_id = a.class_id
       ${facultyJoin}
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN sections sec ON sec.section_id = c.section_id
       JOIN semesters sem ON sem.semester_id = c.semester_id
       ${where}
       ORDER BY a.created_at DESC`,
      params,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /assignments
const addAssignment = async (req, res) => {
  const { class_id, title, description, due_date, marks, attachment_url, status } = req.body;
  if (!class_id || !title) {
    return res.status(400).json({ message: 'class_id and title are required.' });
  }
  if (!req.user.isAdmin && !(await isOwnClass(class_id, req.user.id))) {
    return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO assignments (class_id, title, description, due_date, marks, attachment_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [class_id, title, description || null, due_date || null, marks || 0, attachment_url || null, status || 'Open'],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /assignments/:id
const updateAssignment = async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, marks, attachment_url, status } = req.body;

  try {
    const existing = await pool.query('SELECT class_id FROM assignments WHERE assignment_id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Assignment not found.' });
    if (!req.user.isAdmin && !(await isOwnClass(existing.rows[0].class_id, req.user.id))) {
      return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
    }

    const result = await pool.query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3,
           marks = $4, attachment_url = $5, status = $6
       WHERE assignment_id = $7
       RETURNING *`,
      [title, description || null, due_date || null, marks ?? 0, attachment_url || null, status || 'Open', id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /assignments/:id
const deleteAssignment = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT class_id FROM assignments WHERE assignment_id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Assignment not found.' });
    if (!req.user.isAdmin && !(await isOwnClass(existing.rows[0].class_id, req.user.id))) {
      return res.status(403).json({ message: 'Access denied. That class is not assigned to you.' });
    }

    const result = await pool.query(
      'DELETE FROM assignments WHERE assignment_id = $1 RETURNING assignment_id',
      [id],
    );
    res.json({ message: 'Assignment deleted.', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAssignments, addAssignment, updateAssignment, deleteAssignment };

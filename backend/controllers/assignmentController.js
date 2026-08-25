const pool = require('../config/db');

// GET /assignments
const getAssignments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM assignments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('getAssignments error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /assignments
const addAssignment = async (req, res) => {
  const { title, subject, semester, due_date, marks, status } = req.body;

  if (!title || !subject) {
    return res.status(400).json({ message: 'Title and Subject are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO assignments (title, subject, semester, due_date, marks, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, subject, semester || null, due_date || null, marks || 0, status || 'Open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addAssignment error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PUT /assignments/:id
const updateAssignment = async (req, res) => {
  const { id } = req.params;
  const { title, subject, semester, due_date, marks, status } = req.body;

  if (!title || !subject) {
    return res.status(400).json({ message: 'Title and Subject are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE assignments
       SET title=$1, subject=$2, semester=$3, due_date=$4, marks=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [title, subject, semester, due_date, marks, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Assignment with ID ${id} not found.` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateAssignment error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /assignments/:id
const deleteAssignment = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM assignments WHERE id=$1 RETURNING id', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Assignment with ID ${id} not found.` });
    }
    res.json({ message: 'Assignment deleted successfully.', id });
  } catch (err) {
    console.error('deleteAssignment error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAssignments, addAssignment, updateAssignment, deleteAssignment };

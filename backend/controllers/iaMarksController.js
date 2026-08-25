const pool = require('../config/db');

// GET /iamarks
const getIAMarks = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ia_marks ORDER BY usn ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getIAMarks error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /iamarks
const addIAMarks = async (req, res) => {
  const { usn, name, subject, ia1, ia2, ia3 } = req.body;

  if (!usn || !name) {
    return res.status(400).json({ message: 'USN and Name are required.' });
  }

  // Mark range validation (0–20)
  const marks = [ia1, ia2, ia3].map(Number);
  if (marks.some(m => m < 0 || m > 20)) {
    return res.status(400).json({ message: 'IA marks must be between 0 and 20.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ia_marks (usn, name, subject, ia1, ia2, ia3)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [usn, name, subject || 'General', marks[0], marks[1], marks[2]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addIAMarks error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PUT /iamarks/:id
const updateIAMarks = async (req, res) => {
  const { id } = req.params;
  const { usn, name, subject, ia1, ia2, ia3 } = req.body;

  if (!usn || !name) {
    return res.status(400).json({ message: 'USN and Name are required.' });
  }

  const marks = [ia1, ia2, ia3].map(Number);
  if (marks.some(m => m < 0 || m > 20)) {
    return res.status(400).json({ message: 'IA marks must be between 0 and 20.' });
  }

  try {
    const result = await pool.query(
      `UPDATE ia_marks
       SET usn=$1, name=$2, subject=$3, ia1=$4, ia2=$5, ia3=$6
       WHERE id=$7 RETURNING *`,
      [usn, name, subject || 'General', marks[0], marks[1], marks[2], id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `IA record with ID ${id} not found.` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateIAMarks error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /iamarks/:id
const deleteIAMarks = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM ia_marks WHERE id=$1 RETURNING id', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `IA record with ID ${id} not found.` });
    }
    res.json({ message: 'IA Marks record deleted successfully.', id });
  } catch (err) {
    console.error('deleteIAMarks error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getIAMarks, addIAMarks, updateIAMarks, deleteIAMarks };

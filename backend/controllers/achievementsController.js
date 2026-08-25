const pool = require('../config/db');

// GET /achievements?student_id=X
const getAchievements = async (req, res) => {
  const { student_id } = req.query;
  try {
    const query = student_id
      ? 'SELECT * FROM achievements WHERE student_id=$1 ORDER BY date_achieved DESC, created_at DESC'
      : 'SELECT a.*, s.name AS student_name FROM achievements a JOIN students s ON s.id=a.student_id ORDER BY a.created_at DESC';
    const result = student_id
      ? await pool.query(query, [student_id])
      : await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /achievements
const addAchievement = async (req, res) => {
  const { student_id, usn, category, title, issuer, date_achieved, description } = req.body;
  if (!student_id || !title || !category) {
    return res.status(400).json({ message: 'student_id, title and category are required.' });
  }
  const VALID = ['Certification', 'Hackathon', 'Event', 'Competition', 'Publication', 'Award', 'Other'];
  if (!VALID.includes(category)) {
    return res.status(400).json({ message: `category must be one of: ${VALID.join(', ')}` });
  }
  try {
    const result = await pool.query(
      `INSERT INTO achievements (student_id, usn, category, title, issuer, date_achieved, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [student_id, usn || null, category, title, issuer || null, date_achieved || null, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /achievements/:id
const updateAchievement = async (req, res) => {
  const { id } = req.params;
  const { category, title, issuer, date_achieved, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE achievements SET category=$1, title=$2, issuer=$3, date_achieved=$4, description=$5
       WHERE id=$6 RETURNING *`,
      [category, title, issuer || null, date_achieved || null, description || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Achievement not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /achievements/:id
const deleteAchievement = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM achievements WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Achievement not found.' });
    res.json({ message: 'Achievement deleted.', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAchievements, addAchievement, updateAchievement, deleteAchievement };

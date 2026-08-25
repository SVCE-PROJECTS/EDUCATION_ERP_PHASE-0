const pool = require('../config/db');

// GET /students
const getStudents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY usn ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching students.' });
  }
};

// GET /students/:id/profile
const getStudentProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const studentResult = await pool.query('SELECT * FROM students WHERE id=$1', [id]);
    if (!studentResult.rows.length)
      return res.status(404).json({ message: `Student ${id} not found.` });
    const student = studentResult.rows[0];

    // Attendance summary per subject
    const attResult = await pool.query(
      `SELECT subject,
         COUNT(*) AS total,
         SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present
       FROM attendance WHERE student_id=$1 GROUP BY subject ORDER BY subject ASC`,
      [id]
    );
    const attendanceSummary = attResult.rows.map(r => ({
      subject: r.subject,
      total:   Number(r.total),
      present: Number(r.present),
      absent:  Number(r.total) - Number(r.present),
      percent: Number(r.total) > 0 ? Math.round(Number(r.present)/Number(r.total)*100) : 0,
    }));
    const totalClasses = attendanceSummary.reduce((s,r)=>s+r.total,0);
    const totalPresent = attendanceSummary.reduce((s,r)=>s+r.present,0);
    const overallAttendance = totalClasses > 0 ? Math.round(totalPresent/totalClasses*100) : 0;

    // Recent attendance (last 15)
    const recentAtt = await pool.query(
      `SELECT subject, attendance_date, status FROM attendance
       WHERE student_id=$1 ORDER BY attendance_date DESC LIMIT 15`,
      [id]
    );

    // IA marks
    const iaResult = await pool.query(
      'SELECT * FROM ia_marks WHERE usn=$1 ORDER BY id ASC', [student.usn]
    );
    const iaMarks = iaResult.rows.map(r => ({
      ...r,
      ia1: Number(r.ia1), ia2: Number(r.ia2), ia3: Number(r.ia3),
      average: ((Number(r.ia1)+Number(r.ia2)+Number(r.ia3))/3).toFixed(2),
    }));

    // Assignments for semester
    const assignResult = await pool.query(
      'SELECT * FROM assignments WHERE semester=$1 ORDER BY created_at DESC',
      [String(student.semester)]
    );

    // Achievements
    const achResult = await pool.query(
      'SELECT * FROM achievements WHERE student_id=$1 ORDER BY date_achieved DESC, created_at DESC',
      [id]
    );

    res.json({
      student,
      attendanceSummary,
      overallAttendance,
      recentAttendance: recentAtt.rows,
      iaMarks,
      assignments: assignResult.rows,
      achievements: achResult.rows,
    });
  } catch (err) {
    console.error('getStudentProfile:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /students
const addStudent = async (req, res) => {
  const { usn, name, email, phone, semester, section, status, counsellor } = req.body;
  if (!usn || !name) return res.status(400).json({ message: 'USN and Name are required.' });
  if (!semester || !section) return res.status(400).json({ message: 'Semester and Section are required.' });
  try {
    const result = await pool.query(
      `INSERT INTO students (usn,name,email,phone,semester,section,status,counsellor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [usn,name,email||null,phone||null,semester,section,status||'Active',counsellor||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: `USN '${usn}' already exists.` });
    res.status(500).json({ message: err.message });
  }
};

// PUT /students/:id
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { usn, name, email, phone, semester, section, status, counsellor } = req.body;
  if (!usn || !name) return res.status(400).json({ message: 'USN and Name are required.' });
  try {
    const result = await pool.query(
      `UPDATE students SET usn=$1,name=$2,email=$3,phone=$4,semester=$5,section=$6,status=$7,counsellor=$8
       WHERE id=$9 RETURNING *`,
      [usn,name,email||null,phone||null,semester,section,status||'Active',counsellor||null,id]
    );
    if (!result.rows.length) return res.status(404).json({ message: `Student ${id} not found.` });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /students/:id
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM students WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ message: `Student ${id} not found.` });
    res.json({ message: 'Student deleted.', id });
  } catch (err) {
    res.status(500).json({ message: 'Unable to delete student.' });
  }
};

module.exports = { getStudents, getStudentProfile, addStudent, updateStudent, deleteStudent };

const pool = require('../config/db');

// ────────────────────────────────────────────────
// GET /dashboard/stats
// ────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const studentCount    = await pool.query('SELECT COUNT(*) FROM students');
    const assignmentCount = await pool.query('SELECT COUNT(*) FROM assignments');
    const openAssignments = await pool.query("SELECT COUNT(*) FROM assignments WHERE status='Open'");

    // Overall attendance %
    const totalAtt   = await pool.query('SELECT COUNT(*) FROM attendance');
    const presentAtt = await pool.query("SELECT COUNT(*) FROM attendance WHERE status='Present'");
    const attPercent = Number(totalAtt.rows[0].count) > 0
      ? Math.round((Number(presentAtt.rows[0].count) / Number(totalAtt.rows[0].count)) * 100)
      : 0;

    // IA average
    const iaAvg = await pool.query('SELECT AVG((ia1 + ia2 + ia3) / 3.0) AS avg FROM ia_marks');
    const iaAvgVal = iaAvg.rows[0].avg ? Math.round(Number(iaAvg.rows[0].avg)) : 0;

    // Recent activities
    const recentStudents = await pool.query(
      "SELECT 'Student added: ' || name AS activity, created_at FROM students ORDER BY created_at DESC LIMIT 2"
    );
    const recentAssignments = await pool.query(
      "SELECT 'Assignment: ' || title AS activity, created_at FROM assignments ORDER BY created_at DESC LIMIT 2"
    );
    const recentIA = await pool.query(
      "SELECT 'IA Marks added for: ' || name AS activity, created_at FROM ia_marks ORDER BY created_at DESC LIMIT 2"
    );

    const activities = [
      ...recentStudents.rows,
      ...recentAssignments.rows,
      ...recentIA.rows,
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(r => r.activity);

    res.json({
      totalStudents:     Number(studentCount.rows[0].count),
      attendancePercent: attPercent,
      totalAssignments:  Number(assignmentCount.rows[0].count),
      openAssignments:   Number(openAssignments.rows[0].count),
      iaAverage:         iaAvgVal,
      recentActivities:  activities,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────
// GET /dashboard/weekly-attendance
// Returns per-day attendance % for the last 7 days
// Response: [{ day: 'Mon', date: '2024-01-01', percent: 85, present: 17, total: 20 }, ...]
// ────────────────────────────────────────────────
const getWeeklyAttendance = async (req, res) => {
  try {
    // Last 7 calendar days (today inclusive)
    const result = await pool.query(`
      SELECT
        attendance_date::date                         AS date,
        TO_CHAR(attendance_date::date, 'Dy')          AS day,
        COUNT(*)                                      AS total,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present
      FROM attendance
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '6 days'
        AND attendance_date <= CURRENT_DATE
      GROUP BY attendance_date::date
      ORDER BY attendance_date::date ASC
    `);

    // Build a map of date → stats
    const statsMap = {};
    result.rows.forEach(r => {
      const dateStr = r.date instanceof Date
        ? r.date.toISOString().split('T')[0]
        : String(r.date).split('T')[0];
      statsMap[dateStr] = {
        day:     r.day,
        total:   Number(r.total),
        present: Number(r.present),
        percent: Number(r.total) > 0
          ? Math.round((Number(r.present) / Number(r.total)) * 100)
          : 0,
      };
    });

    // Generate all 7 days even if no attendance was recorded
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue…

      const stats = statsMap[dateStr] || { total: 0, present: 0, percent: 0 };
      days.push({
        date:    dateStr,
        day:     dayName,
        percent: stats.percent,
        present: stats.present,
        total:   stats.total,
      });
    }

    res.json(days);
  } catch (err) {
    console.error('Weekly attendance error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats, getWeeklyAttendance };

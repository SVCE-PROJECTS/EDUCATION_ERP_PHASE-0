/**
 * Unified Dashboard Controller
 * Merged from faculty_student and education_erp dashboard controllers
 * Provides comprehensive dashboard views for faculty and admin
 */

const { pool } = require('../config/db');
const dashboardService = require('../services/dashboard.service');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Faculty/Student Dashboard Stats
 * GET /api/dashboard/stats
 * Returns: student count, attendance %, assignments, IA average, recent activities
 */
const getDashboardStats = async (req, res) => {
  try {
    const [
      studentCount,
      transferredCount,
      departmentCounts,
      departmentByYear,
      assignmentCount,
      openAssignments,
      totalAtt,
      presentAtt,
      iaAvg,
      recentStudents,
      recentAssignments,
      recentIA,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM students'),
      pool.query("SELECT COUNT(*) FROM students WHERE status = 'Transferred'"),
      pool.query(`
        SELECT d.department_name AS label, COUNT(*)::int AS value
        FROM students s
        JOIN departments d ON d.department_id = s.department_id
        GROUP BY d.department_id, d.department_name
        ORDER BY COUNT(*) DESC, d.department_name ASC
        LIMIT 7
      `),
      pool.query(`
        SELECT d.department_name AS dept, st.academic_year AS year, COUNT(*)::int AS value
        FROM students st
        JOIN departments d ON d.department_id = st.department_id
        GROUP BY d.department_name, st.academic_year
        ORDER BY d.department_name ASC, st.academic_year ASC
      `),
      pool.query('SELECT COUNT(*) FROM assignments'),
      pool.query("SELECT COUNT(*) FROM assignments WHERE status='Open'"),
      pool.query('SELECT COUNT(*) FROM attendance'),
      pool.query("SELECT COUNT(*) FROM attendance WHERE status='Present'"),
      pool.query('SELECT AVG(average) AS avg FROM ia_marks'),
      pool.query("SELECT 'Student added: ' || name AS activity, created_at FROM students ORDER BY created_at DESC LIMIT 2"),
      pool.query("SELECT 'Assignment: ' || title AS activity, created_at FROM assignments ORDER BY created_at DESC LIMIT 2"),
      pool.query(`SELECT 'IA Marks added for: ' || s.name AS activity, im.created_at
       FROM ia_marks im
       JOIN students s ON s.library_id = im.student_id
       ORDER BY im.created_at DESC LIMIT 2`),
    ]);

    const attPercent = Number(totalAtt.rows[0].count) > 0
      ? Math.round((Number(presentAtt.rows[0].count) / Number(totalAtt.rows[0].count)) * 100)
      : 0;

    const iaAvgVal = iaAvg.rows[0].avg ? Math.round(Number(iaAvg.rows[0].avg)) : 0;

    const activities = [
      ...recentStudents.rows,
      ...recentAssignments.rows,
      ...recentIA.rows,
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(r => r.activity);

    // Build dept+year breakdown for grouped bar chart
    const deptYearMap = {};
    departmentByYear.rows.forEach(row => {
      if (!deptYearMap[row.dept]) deptYearMap[row.dept] = {};
      deptYearMap[row.dept][row.year] = Number(row.value);
    });

    res.json({
      totalStudents: Number(studentCount.rows[0].count),
      transferredStudents: Number(transferredCount.rows[0].count),
      departmentCounts: departmentCounts.rows.map((row) => ({
        label: row.label,
        value: Number(row.value),
      })),
      departmentByYear: deptYearMap,
      attendancePercent: attPercent,
      totalAssignments: Number(assignmentCount.rows[0].count),
      openAssignments: Number(openAssignments.rows[0].count),
      iaAverage: iaAvgVal,
      recentActivities: activities,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Weekly Attendance Chart
 * GET /api/dashboard/weekly-attendance
 * Returns per-day attendance % for the last 7 days
 * Response: [{ day: 'Mon', date: '2024-01-01', percent: 85, present: 17, total: 20 }, ...]
 */
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
        day: r.day,
        total: Number(r.total),
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
        date: dateStr,
        day: dayName,
        percent: stats.percent,
        present: stats.present,
        total: stats.total,
      });
    }

    res.json(days);
  } catch (err) {
    console.error('Weekly attendance error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * HOD Dashboard (education_erp)
 * GET /api/dashboard/hod
 * Returns comprehensive dashboard for Head of Department
 */
const getHODDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getHODDashboard(req.user.departmentCode);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { 
  getDashboardStats,
  getWeeklyAttendance, 
  getHODDashboard 
};

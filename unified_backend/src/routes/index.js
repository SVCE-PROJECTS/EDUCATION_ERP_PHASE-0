/**
 * Unified Routes Index
 * Central routing configuration for all API endpoints
 */

const express = require('express');
const router = express.Router();

// ── Core Routes ──────────────────────────────────────────────────────────────
const authRoutes = require('./auth.routes');
const studentRoutes = require('./student.routes');
const dropdownRoutes = require('./dropdown.routes');
const transferRoutes = require('./transfer.routes');
const exportRoutes = require('./export.routes');

// ── Dashboard Routes ─────────────────────────────────────────────────────────
const dashboardRoutes = require('./dashboard.routes');

// ── Academic Routes (faculty_student) ────────────────────────────────────────
const achievementsRoutes = require('./achievementsRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const iaMarksRoutes = require('./iaMarksRoutes');
const aiCheckerRoutes = require('./aiCheckerRoutes');

// ── Admin-scoped Faculty & Non-Teaching Staff ─────────────────────────────────
const adminFacultyRoutes       = require('./adminFaculty.routes');
const nonTeachingStaffRoutes   = require('./nonTeachingStaff.routes');

// ── Faculty & Management (education_erp) ─────────────────────────────────────
const facultyRoutes = require('./faculty.routes');
const roleRoutes = require('./role.routes');
const studentListRoutes = require('./studentList.routes');
const slAuthRoutes = require('./slAuth.routes');

// ── Extracurricular Activities (education_erp) ───────────────────────────────
const culturalActivityRoutes = require('./culturalActivity.routes');
const sportsActivityRoutes = require('./sportsActivity.routes');
const technicalEventRoutes = require('./technicalEvent.routes');
const hackathonRoutes = require('./hackathon.routes');
const industryProjectRoutes = require('./industryProject.routes');
const otherCurricularRoutes = require('./otherCurricular.routes');

// ── Mount Routes ─────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Unified ERP API is running',
    timestamp: new Date().toISOString(),
  });
});

// Core
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/dropdown', dropdownRoutes);
router.use('/transfer', transferRoutes);
router.use('/export', exportRoutes);

// Dashboard
router.use('/dashboard', dashboardRoutes);

// Academic
router.use('/achievements', achievementsRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/ia-marks', iaMarksRoutes);
router.use('/ai-checker', aiCheckerRoutes);

// Faculty & Management
router.use('/faculty', facultyRoutes);
router.use('/roles', roleRoutes);
router.use('/hod/student-list', studentListRoutes);  // HOD section dashboard
router.use('/hod/auth', slAuthRoutes);               // HOD alt auth

// Admin-only registries (no department scoping)
router.use('/admin/faculty', adminFacultyRoutes);
router.use('/admin/non-teaching-staff', nonTeachingStaffRoutes);

// Extracurricular Activities
router.use('/activities/cultural', culturalActivityRoutes);
router.use('/activities/sports', sportsActivityRoutes);
router.use('/activities/technical', technicalEventRoutes);
router.use('/activities/hackathons', hackathonRoutes);
router.use('/activities/industry-projects', industryProjectRoutes);
router.use('/activities/other-curricular', otherCurricularRoutes);

module.exports = router;

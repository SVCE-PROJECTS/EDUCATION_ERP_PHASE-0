/**
 * Unified Student Controller
 * Merged from Admin-erp, faculty_student, and education_erp student controllers
 * Provides comprehensive student management including CRUD, profiles, and lists
 */

const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const studentService = require('../services/studentService');
const studentListService = require('../services/studentList.service');

// ═════════════════════════════════════════════════════════════════════════════
// BASIC CRUD OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * List Students with Pagination and Filters (Admin-erp pattern)
 * GET /api/students/list
 * Query params: page, pageSize, sortBy, sortOrder, search, programId, departmentId, sectionId, semester, academicYear
 */
const listStudents = asyncHandler(async (req, res) => {
  const {
    page, pageSize, sortBy, sortOrder, search,
    programId, departmentId, sectionId, semester, academicYear,
  } = req.query;

  const { students, meta } = await studentService.listStudents({
    page: page ? parseInt(page, 10) : undefined,
    pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    sortBy,
    sortOrder,
    search,
    programId: programId ? parseInt(programId, 10) : undefined,
    departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
    sectionId: sectionId ? parseInt(sectionId, 10) : undefined,
    semester: semester ? parseInt(semester, 10) : undefined,
    academicYear,
  });

  success(res, students, meta);
});

/**
 * Get All Students (faculty_student pattern - simple list)
 * GET /api/students
 */
const getStudents = async (req, res) => {
  try {
    const { search, pageSize } = req.query;
    
    // Use repository for proper field mapping
    const filters = {};
    if (search) filters.search = search;
    if (pageSize) filters.pageSize = parseInt(pageSize, 10);
    
    const { rows } = await require('../repositories/studentRepository').findAll(filters);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching students.' });
  }
};

/**
 * Get Student by ID (Admin-erp pattern)
 * GET /api/students/:id
 * :id is the student's library_id (string)
 */
const getById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudent(req.params.id);
  success(res, student);
});

/**
 * Get Comprehensive Student Profile (faculty_student pattern)
 * GET /api/students/:id/profile
 * :id is the student's library_id (string)
 */
const getStudentProfile = async (req, res) => {
  const { id } = req.params;  // library_id string
  try {
    const studentResult = await pool.query(
      `SELECT s.*, sem.semester_number AS semester, sec.section_name AS section,
              p.program_name, d.department_name
       FROM students s
       JOIN semesters   sem ON sem.semester_id  = s.semester_id
       JOIN sections    sec ON sec.section_id   = s.section_id
       JOIN programs    p   ON p.program_id     = s.program_id
       JOIN departments d   ON d.department_id  = s.department_id
       WHERE s.library_id = $1`,
      [id],
    );
    if (!studentResult.rows.length)
      return res.status(404).json({ message: `Student ${id} not found.` });
    const student = studentResult.rows[0];

    // Attendance summary per subject (via class_id → subjects)
    const attResult = await pool.query(
      `SELECT sub.subject_name AS subject,
              COUNT(*)                                              AS total,
              SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END)  AS present
       FROM attendance a
       JOIN classes c   ON c.class_id   = a.class_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       WHERE a.student_id = $1
       GROUP BY sub.subject_name
       ORDER BY sub.subject_name ASC`,
      [id],
    );
    const attendanceSummary = attResult.rows.map(r => ({
      subject: r.subject,
      total:   Number(r.total),
      present: Number(r.present),
      absent:  Number(r.total) - Number(r.present),
      percent: Number(r.total) > 0 ? Math.round(Number(r.present) / Number(r.total) * 100) : 0,
    }));
    const totalClasses  = attendanceSummary.reduce((s, r) => s + r.total,   0);
    const totalPresent  = attendanceSummary.reduce((s, r) => s + r.present, 0);
    const overallAttendance = totalClasses > 0 ? Math.round(totalPresent / totalClasses * 100) : 0;

    // Recent attendance (last 15)
    const recentAtt = await pool.query(
      `SELECT sub.subject_name AS subject, a.attendance_date, a.status
       FROM attendance a
       JOIN classes c    ON c.class_id    = a.class_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       WHERE a.student_id = $1
       ORDER BY a.attendance_date DESC
       LIMIT 15`,
      [id],
    );

    // IA marks (library_id-based, average is DB-generated)
    const iaResult = await pool.query(
      `SELECT im.*, sub.subject_name, sub.subject_code
       FROM ia_marks im
       JOIN classes c    ON c.class_id    = im.class_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       WHERE im.student_id = $1
       ORDER BY im.ia_id ASC`,
      [id],
    );

    // Assignments for student's current section via class_id
    const assignResult = await pool.query(
      `SELECT a.* FROM assignments a
       JOIN classes c ON c.class_id = a.class_id
       WHERE c.section_id = $1
       ORDER BY a.created_at DESC`,
      [student.section_id],
    );

    // Achievements
    const achResult = await pool.query(
      `SELECT * FROM achievements
       WHERE student_id = $1
       ORDER BY achievement_date DESC, created_at DESC`,
      [id],
    );

    res.json({
      student,
      attendanceSummary,
      overallAttendance,
      recentAttendance: recentAtt.rows,
      iaMarks: iaResult.rows,
      assignments: assignResult.rows,
      achievements: achResult.rows,
    });
  } catch (err) {
    console.error('getStudentProfile:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get students by semester + section — used by Faculty portal for attendance
 * GET /api/students/by-section/:semester/:section
 */
const getStudentsBySection = async (req, res) => {
  try {
    const semesterNumber = parseInt(req.params.semester, 10);
    const sectionName    = req.params.section.toUpperCase();

    const result = await pool.query(
      `SELECT s.student_id AS numeric_id, s.library_id AS student_id, s.usn, s.name, s.email, s.phone,
              sem.semester_number, sec.section_name
       FROM students s
       JOIN semesters sem ON sem.semester_id = s.semester_id
       JOIN sections  sec ON sec.section_id  = s.section_id
       WHERE sem.semester_number = $1
         AND UPPER(sec.section_name) = $2
       ORDER BY s.name ASC`,
      [semesterNumber, sectionName]
    );
    res.json({ students: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create Student (service layer — unified schema)
 * POST /api/students
 */
const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body);
  success(res, student, null, 201);
});

/**
 * Update Student (service layer — unified schema)
 * PUT /api/students/:id   — :id is library_id
 */
const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudent(req.params.id, req.body);
  success(res, student);
});

/**
 * Delete Student (service layer — unified schema)
 * DELETE /api/students/:id   — :id is library_id
 */
const deleteStudent = asyncHandler(async (req, res) => {
  await studentService.deleteStudent(req.params.id);
  success(res, { deleted: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// STUDENT LIST MANAGEMENT (education_erp pattern)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get Available Semesters
 * GET /api/students/semesters
 */
const getSemesters = async (req, res, next) => {
  try {
    const data = await studentListService.getSemesters();
    return res.status(200).json({ success: true, message: 'Semesters fetched successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Sections by Semester
 * GET /api/students/semesters/:semester/sections
 */
const getSections = async (req, res, next) => {
  try {
    const semesterNumber = parseInt(req.params.semester, 10);
    const data = await studentListService.getSectionsBySemester(semesterNumber);
    return res.status(200).json({ success: true, message: 'Sections fetched successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Section Dashboard
 * GET /api/students/semesters/:semester/sections/:section
 */
const getSectionDashboard = async (req, res, next) => {
  try {
    const semesterNumber = parseInt(req.params.semester, 10);
    const sectionName = req.params.section.toUpperCase();
    const pagination = { page: req.query.page, limit: req.query.limit };

    const data = await studentListService.getSectionDashboard(semesterNumber, sectionName, pagination);
    return res.status(200).json({ success: true, message: 'Section dashboard fetched successfully', data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listStudents,
  getStudents,
  getById,
  getStudentProfile,
  createStudent,
  updateStudent,
  deleteStudent,
  getSemesters,
  getSections,
  getSectionDashboard,
  getStudentsBySection,
};

/**
 * Unified Repositories Index
 * Central export point for all repositories
 */

// ── Core (raw SQL via pg) ─────────────────────────────────────────────────────
const userRepository      = require('./userRepository');
const studentRepository   = require('./studentRepository');
const dropdownRepository  = require('./dropdownRepository');
const transferRepository  = require('./transferRepository');

// ── Faculty & Auth ───────────────────────────────────────────────────────────
const facultyRepository        = require('./faculty.repository');
const roleRepository           = require('./role.repository');
const auditRepository          = require('./audit.repository');
const slFacultyRepository      = require('./slFacultyRepository');

// ── Academic Structure ────────────────────────────────────────────────────────
const academicSettingsRepository = require('./academicSettingsRepository');
const departmentRepository       = require('./department.repository');
const semesterRepository         = require('./semesterRepository');
const sectionRepository          = require('./sectionRepository');
const timetableRepository        = require('./timetableRepository');

// ── Extracurricular Activities ────────────────────────────────────────────────
const culturalActivityRepository  = require('./culturalActivity.repository');
const sportsActivityRepository    = require('./sportsActivity.repository');
const technicalEventRepository    = require('./technicalEvent.repository');
const hackathonRepository         = require('./hackathon.repository');
const industryProjectRepository   = require('./industryProject.repository');
const otherCurricularRepository   = require('./otherCurricular.repository');

module.exports = {
  // Core
  userRepository,
  studentRepository,
  dropdownRepository,
  transferRepository,

  // Faculty & Auth
  facultyRepository,
  roleRepository,
  auditRepository,
  slFacultyRepository,

  // Academic Structure
  academicSettingsRepository,
  departmentRepository,
  semesterRepository,
  sectionRepository,
  timetableRepository,

  // Extracurricular
  culturalActivityRepository,
  sportsActivityRepository,
  technicalEventRepository,
  hackathonRepository,
  industryProjectRepository,
  otherCurricularRepository,
};

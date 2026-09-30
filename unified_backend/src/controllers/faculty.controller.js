const facultyService = require('../services/faculty.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const path = require('path');

const getFacultyList = async (req, res, next) => {
  try {
    const { items, pagination } = await facultyService.getFacultyList(
      req.user.departmentCode,
      req.query
    );
    return paginatedResponse(res, items, pagination);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const getFacultyById = async (req, res, next) => {
  try {
    const faculty = await facultyService.getFacultyById(
      req.params.id,
      req.user.departmentCode
    );
    return successResponse(res, faculty);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const createFaculty = async (req, res, next) => {
  try {
    // Handle photo upload
    if (req.file) {
      req.body.photo = `/uploads/photos/${req.file.filename}`;
    }

    const faculty = await facultyService.createFaculty(
      req.body,
      req.user.id,
      req.user.departmentCode
    );
    return successResponse(res, faculty, 'Faculty created successfully', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const updateFaculty = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.photo = `/uploads/photos/${req.file.filename}`;
    }

    const faculty = await facultyService.updateFaculty(
      req.params.id,
      req.body,
      req.user.id,
      req.user.departmentCode
    );
    return successResponse(res, faculty, 'Faculty updated successfully');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const deleteFaculty = async (req, res, next) => {
  try {
    const result = await facultyService.deleteFaculty(
      req.params.id,
      req.user.id,
      req.user.departmentCode
    );
    return successResponse(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/**
 * GET /api/faculty/me
 * Returns the logged-in faculty's own profile — no department restriction.
 */
const getMyProfile = async (req, res, next) => {
  try {
    const facultyRepo = require('../repositories/faculty.repository');
    const faculty = await facultyRepo.findByEmployeeId(req.user.id);
    if (!faculty) return errorResponse(res, 'Faculty not found.', 404);
    // normalizeFacultyRow spreads the raw pg row AND adds camelCase aliases,
    // so the hash exists under both password_hash and passwordHash.
    const { passwordHash, password_hash, ...safe } = faculty;
    return successResponse(res, safe);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/**
 * GET /api/faculty/me/classes
 * Returns all classes (subject + section + semester) assigned to the logged-in faculty.
 * Used by Faculty portal to populate dropdowns for attendance / IA marks / assignments.
 */
const getMyClasses = async (req, res, next) => {
  try {
    const { pool } = require('../config/db');
    // faculty.employee_id is the PK string stored in JWT as req.user.id
    const result = await pool.query(
      `SELECT
         c.class_id,
         c.academic_year,
         sub.subject_id,
         sub.subject_name,
         sub.subject_code,
         sec.section_id,
         sec.section_name,
         sem.semester_id,
         sem.semester_number
       FROM classes c
       JOIN faculty  f   ON f.faculty_id   = c.faculty_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN sections sec ON sec.section_id = c.section_id
       JOIN semesters sem ON sem.semester_id = c.semester_id
       WHERE f.employee_id = $1
       ORDER BY sem.semester_number, sec.section_name, sub.subject_name`,
      [req.user.id]
    );
    return successResponse(res, result.rows);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { getFacultyList, getFacultyById, createFaculty, updateFaculty, deleteFaculty, getMyProfile, getMyClasses };

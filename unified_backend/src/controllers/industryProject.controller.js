const svc = require('../services/industryProject.service');
const { successResponse, errorResponse } = require('../utils/response');

const getList = async (req, res, next) => {
  try {
    const { items, pagination } = await svc.getList(req.user.departmentCode, req.query);
    // Return items as data + pagination at top level so the frontend can read
    // both res.data.data (items) and res.data.pagination (paging meta).
    return res.status(200).json({
      success: true,
      message: 'Success',
      data: items,
      pagination,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const record = await svc.getById(req.params.id, req.user.departmentCode);
    return successResponse(res, record);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const record = await svc.create(req.body, req.user.departmentCode, req.user.id);
    return successResponse(res, record, 'Project created successfully', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const record = await svc.update(req.params.id, req.body, req.user.departmentCode, req.user.id);
    return successResponse(res, record, 'Project updated successfully');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await svc.remove(req.params.id, req.user.departmentCode, req.user.id);
    return successResponse(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const addStudent = async (req, res, next) => {
  try {
    const student = await svc.addStudent(req.params.id, req.body, req.user.departmentCode, req.user.id);
    return successResponse(res, student, 'Student added to project', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const removeStudent = async (req, res, next) => {
  try {
    const result = await svc.removeStudent(req.params.id, req.params.studentId, req.user.departmentCode, req.user.id);
    return successResponse(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { getList, getById, create, update, remove, addStudent, removeStudent };

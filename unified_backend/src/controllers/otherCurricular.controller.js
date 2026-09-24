const svc = require('../services/otherCurricular.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getList = async (req, res, next) => {
  try {
    const { items, pagination } = await svc.getList(req.user.departmentCode, req.query);
    return paginatedResponse(res, items, pagination);
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
    return successResponse(res, record, 'Record created successfully', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const record = await svc.update(req.params.id, req.body, req.user.departmentCode, req.user.id);
    return successResponse(res, record, 'Record updated successfully');
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

module.exports = { getList, getById, create, update, remove };

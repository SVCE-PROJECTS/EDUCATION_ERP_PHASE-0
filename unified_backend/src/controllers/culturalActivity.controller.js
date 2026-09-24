const culturalActivityService = require('../services/culturalActivity.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getList = async (req, res, next) => {
  try {
    const { items, pagination } = await culturalActivityService.getList(
      req.user.departmentCode,
      req.query
    );
    return paginatedResponse(res, items, pagination);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const record = await culturalActivityService.getById(
      req.params.id,
      req.user.departmentCode
    );
    return successResponse(res, record);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const record = await culturalActivityService.create(
      req.body,
      req.user.departmentCode,
      req.user.id
    );
    return successResponse(res, record, 'Cultural activity created successfully', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const record = await culturalActivityService.update(
      req.params.id,
      req.body,
      req.user.departmentCode,
      req.user.id
    );
    return successResponse(res, record, 'Cultural activity updated successfully');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await culturalActivityService.remove(
      req.params.id,
      req.user.departmentCode,
      req.user.id
    );
    return successResponse(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { getList, getById, create, update, remove };

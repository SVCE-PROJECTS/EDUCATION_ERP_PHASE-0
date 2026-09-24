'use strict';
const svc = require('../services/nonTeachingStaff.service');
const { successResponse, errorResponse } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page)     || 1);
    const pageSize   = Math.min(100, parseInt(req.query.pageSize) || 20);
    const search     = req.query.search     || undefined;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId) : undefined;
    const status     = req.query.status     || undefined;

    const result = await svc.list({ page, pageSize, search, departmentId, status });
    return res.json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const staff = await svc.getById(parseInt(req.params.id));
    return successResponse(res, staff);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const staff = await svc.create(req.body);
    return successResponse(res, staff, 'Staff member created successfully.', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const staff = await svc.update(parseInt(req.params.id), req.body);
    return successResponse(res, staff, 'Staff member updated successfully.');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await svc.remove(parseInt(req.params.id));
    return successResponse(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };

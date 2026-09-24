const facultyDocService = require('../services/facultyDocument.service');
const { successResponse, errorResponse } = require('../utils/response');

/** POST /api/faculty/me/documents — faculty uploads their own document. */
const uploadMyDocument = async (req, res, next) => {
  try {
    const record = await facultyDocService.uploadDocument(req.user.id, req.file);
    return successResponse(res, record, 'Document uploaded successfully', 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/** GET /api/faculty/me/documents — faculty lists their own documents. */
const listMyDocuments = async (req, res, next) => {
  try {
    const records = await facultyDocService.listOwnDocuments(req.user.id);
    return successResponse(res, records);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/** DELETE /api/faculty/me/documents/:documentId — faculty deletes their own document. */
const deleteMyDocument = async (req, res, next) => {
  try {
    const result = await facultyDocService.removeOwnDocument(req.params.documentId, req.user.id);
    return successResponse(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/** GET /api/faculty/:id/documents — HOD views a given faculty's documents (department-scoped). */
const listDocumentsForFaculty = async (req, res, next) => {
  try {
    const records = await facultyDocService.listForFaculty(req.params.id, req.user.departmentCode);
    return successResponse(res, records);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = {
  uploadMyDocument, listMyDocuments, deleteMyDocument, listDocumentsForFaculty,
};

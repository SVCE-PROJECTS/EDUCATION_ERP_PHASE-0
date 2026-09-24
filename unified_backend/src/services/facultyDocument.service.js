const facultyDocRepo = require('../repositories/facultyDocument.repository');
const facultyRepo = require('../repositories/faculty.repository');
const { deleteUploadedFile } = require('../middleware/upload');
const auditRepo = require('../repositories/audit.repository');
const { resolveDepartmentId } = require('./faculty.service');

// file_path is stored as '/uploads/documents/doc_xxx.pdf' (same convention as
// faculty.photo_url) — deleteUploadedFile wants it relative to the upload
// root, e.g. 'documents/doc_xxx.pdf'.
const toRelativeUploadPath = (filePath) => filePath.replace(/^\/?uploads\//, '');

const uploadDocument = async (employeeId, file) => {
  if (!file) throw { statusCode: 400, message: 'A document file is required.' };

  const faculty = await facultyRepo.findByEmployeeId(employeeId);
  if (!faculty) throw { statusCode: 404, message: 'Faculty not found.' };

  const record = await facultyDocRepo.create({
    employeeId,
    documentName: file.originalname,
    filePath: `/uploads/documents/${file.filename}`,
    fileType: file.mimetype,
    fileSize: file.size,
  });

  const departmentId = await resolveDepartmentId(faculty.departmentCode);
  await auditRepo.create({
    userId: employeeId,
    action: 'UPLOAD_FACULTY_DOCUMENT',
    module: 'faculty_document',
    recordId: record.id,
    oldValue: null,
    newValue: { documentName: record.documentName },
    departmentId,
  });

  return record;
};

const listOwnDocuments = async (employeeId) => facultyDocRepo.findByEmployeeId(employeeId);

/** HOD viewing a specific faculty member's documents — department-scoped. */
const listForFaculty = async (targetEmployeeId, requestingDepartmentCode) => {
  const faculty = await facultyRepo.findByEmployeeId(targetEmployeeId);
  if (!faculty) throw { statusCode: 404, message: 'Faculty not found.' };
  if (requestingDepartmentCode && faculty.departmentCode !== requestingDepartmentCode) {
    throw { statusCode: 403, message: 'Access denied.' };
  }
  return facultyDocRepo.findByEmployeeId(targetEmployeeId);
};

const removeOwnDocument = async (documentId, employeeId) => {
  const doc = await facultyDocRepo.findById(documentId);
  if (!doc) throw { statusCode: 404, message: 'Document not found.' };
  if (doc.employeeId !== employeeId) throw { statusCode: 403, message: 'Access denied.' };

  await facultyDocRepo.remove(documentId);
  await deleteUploadedFile(toRelativeUploadPath(doc.filePath));

  const faculty = await facultyRepo.findByEmployeeId(employeeId);
  const departmentId = await resolveDepartmentId(faculty?.departmentCode);
  await auditRepo.create({
    userId: employeeId,
    action: 'DELETE_FACULTY_DOCUMENT',
    module: 'faculty_document',
    recordId: documentId,
    oldValue: null,
    newValue: { documentName: doc.documentName },
    departmentId,
  });

  return { message: 'Document deleted successfully.' };
};

module.exports = {
  uploadDocument, listOwnDocuments, listForFaculty, removeOwnDocument,
};

const { query } = require('../config/db');

const mapRow = (row) => ({
  id: row.document_id,
  employeeId: row.employee_id,
  documentName: row.document_name,
  filePath: row.file_path,
  fileType: row.file_type,
  fileSize: row.file_size,
  uploadedAt: row.uploaded_at,
});

const create = async ({
  employeeId, documentName, filePath, fileType, fileSize,
}) => {
  const result = await query(
    `INSERT INTO faculty_documents (employee_id, document_name, file_path, file_type, file_size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [employeeId, documentName, filePath, fileType || null, fileSize || null],
  );
  return mapRow(result.rows[0]);
};

const findByEmployeeId = async (employeeId) => {
  const result = await query(
    `SELECT * FROM faculty_documents WHERE employee_id = $1 ORDER BY uploaded_at DESC`,
    [employeeId],
  );
  return result.rows.map(mapRow);
};

const findById = async (documentId) => {
  const result = await query(
    `SELECT * FROM faculty_documents WHERE document_id = $1`,
    [documentId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

const remove = async (documentId) => {
  const result = await query(
    `DELETE FROM faculty_documents WHERE document_id = $1 RETURNING document_id`,
    [documentId],
  );
  return result.rowCount > 0;
};

module.exports = {
  create, findByEmployeeId, findById, remove,
};

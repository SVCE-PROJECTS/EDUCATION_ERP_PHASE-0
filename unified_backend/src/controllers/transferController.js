const asyncHandler = require('../utils/asyncHandler');
const { success, ApiError } = require('../utils/apiResponse');
const transferService = require('../services/transferService');
const transferExportService = require('../services/transferExportService');

const transfer = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Supporting document is required');
  const {
    studentId, newProgramId, newDepartmentId, newSemester, newSectionId, remarks,
  } = req.body;

  const supportingDocumentUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  const result = await transferService.transferStudent({
    studentId,                              // library_id — string, do NOT parseInt
    newProgramId:    parseInt(newProgramId, 10),
    newDepartmentId: parseInt(newDepartmentId, 10),
    newSemester:     parseInt(newSemester, 10),
    newSectionId:    parseInt(newSectionId, 10),
    remarks,
    supportingDocumentUrl,
  }, req.user?.id);

  success(res, result, null, 201);
});

const history = asyncHandler(async (req, res) => {
  // req.params.id is a library_id string — do NOT parseInt
  const rows = await transferService.getTransferHistory(req.params.id);
  success(res, rows);
});

/**
 * GET /api/transfer — every transfer, newest first. Backs the Dashboard's
 * "Transferred Students" tap-to-view detail list.
 */
const listAll = asyncHandler(async (req, res) => {
  const rows = await transferService.listAllTransfers();
  success(res, rows);
});

/**
 * GET /api/transfer/export?format=excel|pdf
 */
const exportTransfers = asyncHandler(async (req, res) => {
  const format = (req.query.format || 'excel').toLowerCase();

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transferred-students.pdf"');
    await transferExportService.buildTransferPdfStream(res);
    return;
  }

  const buffer = await transferExportService.buildTransferExcelBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', 'attachment; filename="transferred-students.xlsx"');
  res.send(buffer);
});

module.exports = {
  transfer, history, listAll, exportTransfers,
};

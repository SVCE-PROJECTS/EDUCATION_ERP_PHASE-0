const asyncHandler = require('../utils/asyncHandler');
const { success, ApiError } = require('../utils/apiResponse');
const exportService = require('../services/exportService');

const ENTITY_KEYS = Object.keys(exportService.ENTITIES);

const buildFilters = (entity, source) => {
  if (entity === 'students') {
    return {
      search: source.search || undefined,
      programId: source.programId ? parseInt(source.programId, 10) : undefined,
      departmentId: source.departmentId ? parseInt(source.departmentId, 10) : undefined,
      sectionId: source.sectionId ? parseInt(source.sectionId, 10) : undefined,
      semester: source.semester ? parseInt(source.semester, 10) : undefined,
      academicYear: source.academicYear || undefined,
    };
  }
  if (entity === 'faculty') {
    return {
      search: source.search || undefined,
      departmentId: source.departmentId ? parseInt(source.departmentId, 10) : undefined,
      designation: source.designation || undefined,
      status: source.status || undefined,
    };
  }
  // non-teaching-staff
  return {
    search: source.search || undefined,
    departmentId: source.departmentId ? parseInt(source.departmentId, 10) : undefined,
    status: source.status || undefined,
  };
};

const requireValidEntity = (entity) => {
  if (!ENTITY_KEYS.includes(entity)) {
    throw new ApiError(400, `entity must be one of: ${ENTITY_KEYS.join(', ')}`);
  }
};

const preview = asyncHandler(async (req, res) => {
  const { entity } = req.params;
  requireValidEntity(entity);
  const result = await exportService.preview(entity, buildFilters(entity, req.query));
  success(res, result);
});

const exportData = asyncHandler(async (req, res) => {
  const { entity } = req.params;
  requireValidEntity(entity);
  const filters = buildFilters(entity, req.body);
  const format = (req.body.format || 'excel').toLowerCase();
  const { filenameBase } = exportService.ENTITIES[entity];

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
    await exportService.buildPdfStream(entity, filters, res);
    return;
  }

  const buffer = await exportService.buildExcelBuffer(entity, filters);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
  res.send(buffer);
});

module.exports = { preview, exportData };

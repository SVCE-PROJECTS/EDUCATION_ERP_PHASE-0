const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const studentRepository = require('../repositories/studentRepository');
const facultyRepository = require('../repositories/adminFaculty.repository');
const staffRepository = require('../repositories/nonTeachingStaff.repository');

async function fetchFilteredStudents(filters) {
  const { rows } = await studentRepository.findAll({
    ...filters,
    page: 1,
    pageSize: 100000, // export = all matching records, not paginated
  });
  return rows.map((r) => {
    let idLabel = '-';
    if (r.usn && r.libraryId) idLabel = `${r.usn} / ${r.libraryId}`;
    else if (r.usn || r.libraryId) idLabel = r.usn || r.libraryId;
    return { ...r, idLabel };
  });
}

async function fetchFilteredFaculty(filters) {
  const { data } = await facultyRepository.findAll({ ...filters, page: 1, pageSize: 100000 });
  return data;
}

async function fetchFilteredStaff(filters) {
  const { data } = await staffRepository.findAll({ ...filters, page: 1, pageSize: 100000 });
  return data;
}

// One entry per exportable entity — the Registry screen's three tabs each
// export against their own key. Keep in sync with the frontend's
// ExportMenu `entity` prop values.
const ENTITIES = {
  students: {
    title: 'Student Records',
    sheetName: 'Students',
    filenameBase: 'students',
    columns: [
      { header: 'USN / Library ID', key: 'idLabel', width: 20 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Department', key: 'departmentName', width: 18 },
      { header: 'Program', key: 'programName', width: 12 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Section', key: 'sectionName', width: 10 },
      { header: 'Academic Year', key: 'academicYear', width: 14 },
    ],
    fetch: fetchFilteredStudents,
  },
  faculty: {
    title: 'Faculty Records',
    sheetName: 'Faculty',
    filenameBase: 'faculty',
    columns: [
      { header: 'Employee ID', key: 'employeeId', width: 16 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Department', key: 'departmentName', width: 18 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
    ],
    fetch: fetchFilteredFaculty,
  },
  'non-teaching-staff': {
    title: 'Non-Teaching Staff Records',
    sheetName: 'Non-Teaching Staff',
    filenameBase: 'non-teaching-staff',
    columns: [
      { header: 'Employee ID', key: 'employeeId', width: 16 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Department', key: 'departmentName', width: 18 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
    ],
    fetch: fetchFilteredStaff,
  },
};

async function preview(entityKey, filters) {
  const entity = ENTITIES[entityKey];
  const rows = await entity.fetch(filters);
  return {
    total: rows.length,
    sample: rows.slice(0, 5),
  };
}

async function buildExcelBuffer(entityKey, filters) {
  const entity = ENTITIES[entityKey];
  const rows = await entity.fetch(filters);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(entity.sheetName);
  sheet.columns = entity.columns;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

function buildPdfStream(entityKey, filters, res) {
  const entity = ENTITIES[entityKey];
  return entity.fetch(filters).then((rows) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(16).text(entity.title, { align: 'center' });
    doc.moveDown();

    // Distribute the page's usable width across columns proportionally to
    // each column's configured `width` (same numbers used for the Excel
    // sheet), rather than hardcoding one fixed layout per entity.
    const availableWidth = 760;
    const totalUnits = entity.columns.reduce((sum, col) => sum + col.width, 0);
    const colWidths = entity.columns.map((col) => (col.width / totalUnits) * availableWidth);

    const startX = doc.x;
    let y = doc.y;

    doc.fontSize(10).font('Helvetica-Bold');
    entity.columns.forEach((col, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(col.header, x, y, { width: colWidths[i] });
    });

    doc.font('Helvetica');
    y += 20;
    rows.forEach((row) => {
      entity.columns.forEach((col, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(String(row[col.key] ?? '-'), x, y, { width: colWidths[i] });
      });
      y += 18;
      if (y > 500) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  });
}

module.exports = {
  ENTITIES, preview, buildExcelBuffer, buildPdfStream,
};

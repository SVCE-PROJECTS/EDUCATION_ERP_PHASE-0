const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const transferRepository = require('../repositories/transferRepository');

const EXPORT_COLUMNS = [
  { header: 'Student Name', key: 'studentName', width: 22 },
  { header: 'USN', key: 'usn', width: 16 },
  { header: 'Old Department', key: 'oldDepartmentName', width: 22 },
  { header: 'Old Sem', key: 'oldSemester', width: 8 },
  { header: 'Old Section', key: 'oldSectionName', width: 10 },
  { header: 'New Department', key: 'newDepartmentName', width: 22 },
  { header: 'New Sem', key: 'newSemester', width: 8 },
  { header: 'New Section', key: 'newSectionName', width: 10 },
  { header: 'Transfer Date', key: 'transferDate', width: 14 },
  { header: 'Reason', key: 'reason', width: 26 },
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

async function fetchTransfers() {
  const rows = await transferRepository.findAll();
  return rows.map((row) => ({ ...row, transferDate: formatDate(row.transferDate) }));
}

async function buildTransferExcelBuffer() {
  const rows = await fetchTransfers();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transferred Students');
  sheet.columns = EXPORT_COLUMNS;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

function buildTransferPdfStream(res) {
  return fetchTransfers().then((rows) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(16).text('Transferred Students — Previous & New Department', { align: 'center' });
    doc.moveDown();

    const colWidths = [95, 70, 95, 42, 55, 95, 42, 55, 65, 95];
    const startX = doc.x;
    let y = doc.y;

    doc.fontSize(9).font('Helvetica-Bold');
    EXPORT_COLUMNS.forEach((col, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(col.header, x, y, { width: colWidths[i] });
    });

    doc.font('Helvetica');
    y += 18;
    rows.forEach((row) => {
      EXPORT_COLUMNS.forEach((col, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(String(row[col.key] ?? '-'), x, y, { width: colWidths[i] });
      });
      y += 16;
      if (y > 500) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  });
}

module.exports = { buildTransferExcelBuffer, buildTransferPdfStream };

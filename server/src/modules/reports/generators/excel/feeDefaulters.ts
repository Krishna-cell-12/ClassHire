import ExcelJS from 'exceljs';

interface DefaulterRow {
  student: { rollNumber: string; firstName: string; lastName: string };
  slab: { semester: number; batchYear: number; dueDate: Date };
  paid: number;
  pending: number;
  status: string;
}

const COLUMN_COUNT = 8; // Roll No., Name, Semester, Batch, Due Date, Paid, Pending, Status
const SUMMARY_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };

export function buildFeeDefaultersWorkbook(workbook: ExcelJS.Workbook, rows: DefaulterRow[], summary: string) {
  const sheet = workbook.addWorksheet('Fee Defaulters');

  sheet.mergeCells(1, 1, 1, COLUMN_COUNT);
  const summaryCell = sheet.getCell(1, 1);
  summaryCell.value = `Summary: ${summary}`;
  summaryCell.font = { bold: true, italic: true };
  summaryCell.fill = SUMMARY_FILL;
  summaryCell.alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(1).height = 34;
  sheet.addRow([]); // spacer row

  sheet.addRow(['Roll No.', 'Name', 'Semester', 'Batch', 'Due Date', 'Paid', 'Pending', 'Status']);
  sheet.getRow(3).font = { bold: true };

  for (const row of rows) {
    sheet.addRow([
      row.student.rollNumber,
      `${row.student.firstName} ${row.student.lastName}`,
      row.slab.semester,
      row.slab.batchYear,
      row.slab.dueDate.toISOString().slice(0, 10),
      row.paid,
      row.pending,
      row.status,
    ]);
  }

  sheet.columns.forEach((col) => {
    col.width = 16;
  });
}

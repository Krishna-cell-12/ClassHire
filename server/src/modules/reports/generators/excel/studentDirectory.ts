import ExcelJS from 'exceljs';

interface StudentRow {
  rollNumber: string;
  firstName: string;
  lastName: string;
  department: { name: string };
  currentSemester: number;
  batchYear: number;
  phone: string | null;
  isActive: boolean;
}

export function buildStudentDirectoryWorkbook(workbook: ExcelJS.Workbook, students: StudentRow[]) {
  const sheet = workbook.addWorksheet('Students');

  sheet.addRow(['Roll No.', 'Name', 'Department', 'Semester', 'Batch', 'Phone', 'Active']);
  sheet.getRow(1).font = { bold: true };

  for (const s of students) {
    sheet.addRow([
      s.rollNumber,
      `${s.firstName} ${s.lastName}`,
      s.department.name,
      s.currentSemester,
      s.batchYear,
      s.phone ?? '',
      s.isActive ? 'Yes' : 'No',
    ]);
  }

  sheet.columns.forEach((col) => {
    col.width = 16;
  });
}

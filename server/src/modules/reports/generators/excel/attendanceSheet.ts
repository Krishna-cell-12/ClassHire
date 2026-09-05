import ExcelJS from 'exceljs';
import { computeAttendancePercentages } from '../../reportSummary';

interface SessionInfo {
  id: string;
  date: Date;
}

interface AttendanceSheetData {
  course: { code: string; name: string };
  sessions: SessionInfo[];
  students: Array<{ id: string; rollNumber: string; firstName: string; lastName: string }>;
  recordsBySessionAndStudent: Map<string, string>; // key `${sessionId}:${studentId}` -> status
  /** AI-generated (or template-fallback) 2-sentence executive summary -- see reportSummary.ts. */
  summary: string;
}

const SUMMARY_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

export function buildAttendanceWorkbook(workbook: ExcelJS.Workbook, data: AttendanceSheetData) {
  const { course, sessions, students, recordsBySessionAndStudent, summary } = data;
  const sheet = workbook.addWorksheet(`${course.code} Attendance`);
  const columnCount = 2 + sessions.length + 1; // Roll No. + Name + one per session + %

  sheet.mergeCells(1, 1, 1, columnCount);
  const summaryCell = sheet.getCell(1, 1);
  summaryCell.value = `Summary: ${summary}`;
  summaryCell.font = { bold: true, italic: true };
  summaryCell.fill = SUMMARY_FILL;
  summaryCell.alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(1).height = 34;
  sheet.addRow([]); // spacer row

  const header = ['Roll No.', 'Name', ...sessions.map((s) => s.date.toISOString().slice(0, 10)), '%'];
  sheet.addRow(header);
  sheet.getRow(3).font = { bold: true };

  const pctByStudent = computeAttendancePercentages({ sessions, students, recordsBySessionAndStudent });

  for (const student of students) {
    const cells = sessions.map((s) => recordsBySessionAndStudent.get(`${s.id}:${student.id}`) ?? '-');
    sheet.addRow([student.rollNumber, `${student.firstName} ${student.lastName}`, ...cells, `${pctByStudent.get(student.id) ?? 0}%`]);
  }

  sheet.columns.forEach((col) => {
    col.width = 14;
  });
}

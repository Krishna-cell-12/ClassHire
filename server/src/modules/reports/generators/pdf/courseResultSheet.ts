import { computeExamResultStats } from '../../reportSummary';

interface ResultRow {
  student: { rollNumber: string; firstName: string; lastName: string };
  marksObtained: number;
  grade: string | null;
}

interface CourseResultData {
  course: { code: string; name: string };
  exam: { title: string; examType: string; maxMarks: number };
  rows: ResultRow[];
  /** AI-generated (or template-fallback) 2-sentence executive summary -- see reportSummary.ts. */
  summary: string;
}

function drawSummaryBox(doc: PDFKit.PDFDocument, summary: string) {
  const boxX = doc.page.margins.left;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxY = doc.y;

  doc.font('Helvetica').fontSize(10);
  const textHeight = doc.heightOfString(summary, { width: boxWidth - 24 });
  const boxHeight = textHeight + 34;

  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4).fillOpacity(1).fillAndStroke('#EFF6FF', '#BFDBFE');
  doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(9).text('SUMMARY', boxX + 12, boxY + 10);
  doc.font('Helvetica').fontSize(10).text(summary, boxX + 12, boxY + 24, { width: boxWidth - 24 });
  doc.fillColor('black');

  doc.y = boxY + boxHeight + 14;
}

export function buildCourseResultSheet(doc: PDFKit.PDFDocument, data: CourseResultData) {
  const { course, exam, rows, summary } = data;

  doc.fontSize(18).text('Course Result Sheet', { align: 'center' });
  doc.moveDown();

  drawSummaryBox(doc, summary);

  doc.fontSize(12);
  doc.text(`Course: ${course.code} - ${course.name}`);
  doc.text(`Exam: ${exam.title} (${exam.examType})    Max Marks: ${exam.maxMarks}`);
  doc.moveDown();

  const stats = computeExamResultStats(course, exam, rows);
  doc.text(`Class Average: ${stats.averageMarks}    Highest: ${stats.highest}    Lowest: ${stats.lowest}`);
  doc.moveDown();

  doc.fontSize(10);
  const colX = { roll: 50, name: 150, marks: 350, grade: 450 };
  doc.text('Roll No.', colX.roll, doc.y, { continued: false });
  doc.text('Name', colX.name, doc.y);
  doc.text('Marks', colX.marks, doc.y);
  doc.text('Grade', colX.grade, doc.y);
  doc.moveDown(0.5);

  for (const r of rows) {
    const y = doc.y;
    doc.text(r.student.rollNumber, colX.roll, y, { width: 90 });
    doc.text(`${r.student.firstName} ${r.student.lastName}`, colX.name, y, { width: 190 });
    doc.text(`${r.marksObtained}`, colX.marks, y, { width: 90 });
    doc.text(r.grade ?? '-', colX.grade, y);
    doc.moveDown(0.6);
  }
}

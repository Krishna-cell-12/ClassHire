import PDFDocument from 'pdfkit';

interface ReportCardData {
  student: {
    rollNumber: string;
    firstName: string;
    lastName: string;
    department: { name: string };
    currentSemester: number;
    batchYear: number;
  };
  attendancePct: number | null;
  feeStatus: { status: string; paid: number; total: number; pending: number } | null;
  results: Array<{
    exam: { title: string; examType: string; maxMarks: number; course: { name: string; code: string } };
    marksObtained: number;
    grade: string | null;
  }>;
}

export function buildStudentReportCard(doc: PDFKit.PDFDocument, data: ReportCardData) {
  const { student, attendancePct, feeStatus, results } = data;

  doc.fontSize(18).text('Student Report Card', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Name: ${student.firstName} ${student.lastName}`);
  doc.text(`Roll Number: ${student.rollNumber}`);
  doc.text(`Department: ${student.department.name}`);
  doc.text(`Semester: ${student.currentSemester}    Batch: ${student.batchYear}`);
  doc.text(`Attendance: ${attendancePct === null ? 'N/A' : `${attendancePct}%`}`);
  doc.text(
    `Fee Status: ${feeStatus ? `${feeStatus.status} (paid ${feeStatus.paid} of ${feeStatus.total}, pending ${feeStatus.pending})` : 'No applicable fee slab'}`,
  );
  doc.moveDown();

  doc.fontSize(14).text('Exam Results', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);

  const colX = { course: 50, exam: 200, marks: 350, grade: 450 };
  doc.text('Course', colX.course, doc.y, { continued: false });
  doc.text('Exam', colX.exam, doc.y);
  doc.text('Marks', colX.marks, doc.y);
  doc.text('Grade', colX.grade, doc.y);
  doc.moveDown(0.5);

  for (const r of results) {
    const y = doc.y;
    doc.text(`${r.exam.course.code} - ${r.exam.course.name}`, colX.course, y, { width: 140 });
    doc.text(`${r.exam.title} (${r.exam.examType})`, colX.exam, y, { width: 140 });
    doc.text(`${r.marksObtained} / ${r.exam.maxMarks}`, colX.marks, y, { width: 90 });
    doc.text(r.grade ?? '-', colX.grade, y);
    doc.moveDown(0.7);
  }
}

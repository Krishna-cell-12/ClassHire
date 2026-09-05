import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

import * as studentsService from '../students/students.service';
import * as attendanceService from '../attendance/attendance.service';
import * as feesService from '../fees/fees.service';
import * as examsService from '../exams/exams.service';
import * as coursesService from '../courses/courses.service';
import * as departmentsService from '../departments/departments.service';

import { buildStudentReportCard } from './generators/pdf/studentReportCard';
import { buildCourseResultSheet } from './generators/pdf/courseResultSheet';
import { buildAttendanceWorkbook } from './generators/excel/attendanceSheet';
import { buildFeeDefaultersWorkbook } from './generators/excel/feeDefaulters';
import { buildStudentDirectoryWorkbook } from './generators/excel/studentDirectory';
import { getAttendanceExecutiveSummary, getFeeDefaultersExecutiveSummary, getExamResultExecutiveSummary } from './reportSummary';

function pdfHeaders(res: Response, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

function xlsxHeaders(res: Response, filename: string) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

export async function studentReportCard(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.params.id;
    const [student, attendancePct, feeStatus, results] = await Promise.all([
      studentsService.getStudent(studentId),
      attendanceService.attendancePercentageForStudent(studentId),
      feesService.computeFeeStatusForStudent(studentId),
      examsService.getResultsForStudent(studentId),
    ]);

    pdfHeaders(res, `report-card-${student.rollNumber}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    buildStudentReportCard(doc, {
      student,
      attendancePct,
      feeStatus: feeStatus
        ? { status: feeStatus.status, paid: feeStatus.paid, total: feeStatus.total, pending: feeStatus.pending }
        : null,
      results: results as any,
    });
    doc.end();
  } catch (err) {
    next(err);
  }
}

export async function courseAttendanceExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const courseId = req.params.courseId;
    const [course, grid] = await Promise.all([
      coursesService.getCourse(courseId),
      attendanceService.courseAttendanceGrid(courseId),
    ]);

    // Compute-then-summarize: the real numbers are derived from the exact same `grid` the
    // table below is built from, before the LLM (or its template fallback) ever sees them.
    const { text: summary } = await getAttendanceExecutiveSummary(course, grid);

    xlsxHeaders(res, `attendance-${course.code}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    buildAttendanceWorkbook(workbook, { course, ...grid, summary });
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

export async function feeDefaultersExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const departmentId = req.query.departmentId as string | undefined;
    const [rows, departments, allStudents] = await Promise.all([
      feesService.feeDefaulters(departmentId),
      departmentsService.listDepartments(),
      studentsService.listAllStudentsForExport(),
    ]);

    const totalStudentsByDepartment = new Map<string, number>();
    for (const student of allStudents) {
      totalStudentsByDepartment.set(student.departmentId, (totalStudentsByDepartment.get(student.departmentId) ?? 0) + 1);
    }
    const scopeLabel = departmentId
      ? (departments.find((d) => d.id === departmentId)?.code ?? 'selected department')
      : 'All Departments';

    const { text: summary } = await getFeeDefaultersExecutiveSummary(rows as any, departments, totalStudentsByDepartment, scopeLabel);

    xlsxHeaders(res, 'fee-defaulters.xlsx');
    const workbook = new ExcelJS.Workbook();
    buildFeeDefaultersWorkbook(workbook, rows as any, summary);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

export async function courseResultSheetPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const examId = req.params.examId;
    const data = await examsService.getExamResultSheetData(examId);
    const exam = { ...data.exam, maxMarks: Number(data.exam.maxMarks) };
    const rows = data.rows.map((r) => ({ ...r, marksObtained: Number(r.marksObtained) }));

    const { text: summary } = await getExamResultExecutiveSummary(data.course, exam, rows);

    pdfHeaders(res, `result-sheet-${data.course.code}-${examId}.pdf`);
    const doc = new PDFDocument({ margin: 50, layout: 'landscape' });
    doc.pipe(res);
    buildCourseResultSheet(doc, { course: data.course, exam, rows: rows as any, summary });
    doc.end();
  } catch (err) {
    next(err);
  }
}

export async function studentDirectoryExcel(_req: Request, res: Response, next: NextFunction) {
  try {
    const students = await studentsService.listAllStudentsForExport();

    xlsxHeaders(res, 'students.xlsx');
    const workbook = new ExcelJS.Workbook();
    buildStudentDirectoryWorkbook(workbook, students as any);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

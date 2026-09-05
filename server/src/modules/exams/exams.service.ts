import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { computeGrade } from '../../utils/grade';
import { CreateExamInput, EnterMarksInput, UpdateExamInput } from './exams.schema';

export function listExams(courseId?: string) {
  return prisma.exam.findMany({
    where: { courseId },
    include: { course: true },
    orderBy: { examDate: 'desc' },
  });
}

export async function getExam(id: string) {
  const exam = await prisma.exam.findUnique({ where: { id }, include: { course: true } });
  if (!exam) throw AppError.notFound('Exam not found');
  return exam;
}

export function createExam(input: CreateExamInput) {
  return prisma.exam.create({ data: input });
}

export async function updateExam(id: string, input: UpdateExamInput) {
  await getExam(id);
  return prisma.exam.update({ where: { id }, data: input });
}

export async function getExamCourseId(id: string): Promise<string> {
  const exam = await prisma.exam.findUnique({ where: { id }, select: { courseId: true } });
  if (!exam) throw AppError.notFound('Exam not found');
  return exam.courseId;
}

export async function enterMarks(examId: string, input: EnterMarksInput, enteredBy?: string) {
  const exam = await getExam(examId);
  const maxMarks = Number(exam.maxMarks);

  for (const m of input.marks) {
    if (m.marksObtained > maxMarks) {
      throw AppError.badRequest(`marksObtained (${m.marksObtained}) exceeds maxMarks (${maxMarks}) for student ${m.studentId}`);
    }
  }

  return prisma.$transaction(
    input.marks.map((m) =>
      prisma.resultMark.upsert({
        where: { examId_studentId: { examId, studentId: m.studentId } },
        create: {
          examId,
          studentId: m.studentId,
          marksObtained: m.marksObtained,
          remarks: m.remarks,
          grade: computeGrade(m.marksObtained, maxMarks),
          enteredBy,
        },
        update: {
          marksObtained: m.marksObtained,
          remarks: m.remarks,
          grade: computeGrade(m.marksObtained, maxMarks),
          enteredBy,
        },
      }),
    ),
  );
}

export async function getExamResultSheetData(examId: string) {
  const exam = await getExam(examId);
  const marks = await getExamMarks(examId);
  return { course: exam.course, exam, rows: marks };
}

export function getExamMarks(examId: string) {
  return prisma.resultMark.findMany({
    where: { examId },
    include: { student: true },
    orderBy: { student: { rollNumber: 'asc' } },
  });
}

export function getResultsForStudent(studentId: string) {
  return prisma.resultMark.findMany({
    where: { studentId },
    include: { exam: { include: { course: true } } },
    orderBy: { exam: { examDate: 'desc' } },
  });
}

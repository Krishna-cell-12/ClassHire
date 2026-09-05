import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { paginationMeta, skipTake } from '../../utils/pagination';
import * as authService from '../auth/auth.service';
import { CreateStudentInput, ListStudentsQuery, UpdateStudentInput } from './students.schema';
import { computeFeeStatusForStudent, computeFeeStandingForStudents } from '../fees/fees.service';
import { attendancePercentageForStudent, attendanceForStudents } from '../attendance/attendance.service';

// Shared by the plain student list and the natural-language search (nlSearch.service.ts) so
// "partial name match" is defined in exactly one place.
export function nameSearchClause(search: string): Pick<Prisma.StudentWhereInput, 'OR'> {
  return {
    OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { rollNumber: { contains: search, mode: 'insensitive' } },
    ],
  };
}

export async function listStudents(query: ListStudentsQuery) {
  const { page, limit, departmentId, semester, batchYear, search } = query;
  const where: Prisma.StudentWhereInput = {
    departmentId,
    currentSemester: semester,
    batchYear,
    ...(search ? nameSearchClause(search) : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { department: true },
      orderBy: { rollNumber: 'asc' },
      ...skipTake(page, limit),
    }),
    prisma.student.count({ where }),
  ]);

  // The directory shows attendance and fee standing per row. Both are derived
  // values rather than Student columns, so they're fetched in bulk for just this
  // page -- two extra grouped queries regardless of page size, never one per row.
  const ids = rows.map((s) => s.id);
  const [attendance, fees] = await Promise.all([attendanceForStudents(ids), computeFeeStandingForStudents(ids)]);

  const data = rows.map((student) => {
    const tally = attendance.get(student.id);
    const fee = fees.get(student.id);
    return {
      ...student,
      attendancePct: tally?.percentage ?? null,
      attendedSessions: tally?.present ?? 0,
      totalSessions: tally?.total ?? 0,
      feeStatus: fee?.status ?? null,
      feePending: fee?.pending ?? null,
      feeTotal: fee?.total ?? null,
      feePaid: fee?.paid ?? null,
      feeSlabId: fee?.slabId ?? null,
      feeDueDate: fee?.dueDate ?? null,
    };
  });

  return { data, meta: paginationMeta(page, limit, total) };
}

export async function getStudent(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { department: true, user: { select: { email: true, isActive: true } } },
  });
  if (!student) throw AppError.notFound('Student not found');
  return student;
}

export function createStudent(input: CreateStudentInput) {
  return authService.register({ ...input, role: Role.STUDENT });
}

export async function updateStudent(id: string, input: UpdateStudentInput) {
  await getStudent(id);
  const { isActive, departmentId, ...rest } = input;
  return prisma.student.update({
    where: { id },
    data: {
      ...rest,
      ...(departmentId ? { department: { connect: { id: departmentId } } } : {}),
      ...(isActive !== undefined ? { isActive, user: { update: { isActive } } } : {}),
    },
  });
}

export async function deactivateStudent(id: string) {
  const student = await getStudent(id);
  await prisma.$transaction([
    prisma.student.update({ where: { id }, data: { isActive: false } }),
    prisma.user.update({ where: { id: student.userId }, data: { isActive: false } }),
  ]);
}

export function listAllStudentsForExport() {
  return prisma.student.findMany({
    include: { department: true },
    orderBy: { rollNumber: 'asc' },
  });
}

export async function getStudentSummary(id: string) {
  const student = await getStudent(id);
  const [attendancePct, feeStatus, recentResults] = await Promise.all([
    attendancePercentageForStudent(id),
    computeFeeStatusForStudent(id),
    prisma.resultMark.findMany({
      where: { studentId: id },
      include: { exam: { include: { course: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);
  return { student, attendancePct, feeStatus, recentResults };
}

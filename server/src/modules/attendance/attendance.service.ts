import { AttendanceStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { CreateSessionInput, MarkAttendanceInput } from './attendance.schema';

export async function getSessionCourseId(sessionId: string): Promise<string> {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true },
  });
  if (!session) throw AppError.notFound('Attendance session not found');
  return session.courseId;
}

export function createSession(input: CreateSessionInput) {
  return prisma.attendanceSession.create({ data: input });
}

export function listSessions(courseId: string) {
  return prisma.attendanceSession.findMany({
    where: { courseId },
    orderBy: { date: 'desc' },
    include: { _count: { select: { records: true } } },
  });
}

export async function markAttendance(sessionId: string, input: MarkAttendanceInput) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw AppError.notFound('Attendance session not found');

  return prisma.$transaction(
    input.records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        create: { sessionId, studentId: r.studentId, status: r.status },
        update: { status: r.status },
      }),
    ),
  );
}

export async function attendanceForStudent(studentId: string, courseId?: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId, ...(courseId ? { session: { courseId } } : {}) },
    include: { session: { include: { course: true } } },
    orderBy: { session: { date: 'desc' } },
  });
  const total = records.length;
  const present = records.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
  const percentage = total === 0 ? null : Math.round((present / total) * 1000) / 10;
  return { records, total, present, percentage };
}

export async function attendancePercentageForStudent(studentId: string): Promise<number | null> {
  const { percentage } = await attendanceForStudent(studentId);
  return percentage;
}

export interface AttendanceTally {
  total: number;
  present: number;
  percentage: number | null;
}

/**
 * Attendance tallies for many students in one grouped query, for list views that
 * would otherwise call attendanceForStudent() once per row. Uses the same
 * "PRESENT or LATE counts as attended" rule as the single-student path.
 */
export async function attendanceForStudents(studentIds: string[]): Promise<Map<string, AttendanceTally>> {
  const out = new Map<string, AttendanceTally>();
  if (studentIds.length === 0) return out;

  const rows = await prisma.attendanceRecord.groupBy({
    by: ['studentId', 'status'],
    where: { studentId: { in: studentIds } },
    _count: { _all: true },
  });

  for (const row of rows) {
    const acc = out.get(row.studentId) ?? { total: 0, present: 0, percentage: null };
    acc.total += row._count._all;
    if (row.status === AttendanceStatus.PRESENT || row.status === AttendanceStatus.LATE) {
      acc.present += row._count._all;
    }
    out.set(row.studentId, acc);
  }

  for (const tally of out.values()) {
    tally.percentage = tally.total === 0 ? null : Math.round((tally.present / tally.total) * 1000) / 10;
  }

  // Students with no records at all are absent from the groupBy result.
  for (const id of studentIds) {
    if (!out.has(id)) out.set(id, { total: 0, present: 0, percentage: null });
  }

  return out;
}

export async function courseAttendanceGrid(courseId: string) {
  const [sessions, enrollments, records] = await Promise.all([
    prisma.attendanceSession.findMany({ where: { courseId }, orderBy: { date: 'asc' } }),
    prisma.enrollment.findMany({ where: { courseId }, include: { student: true }, orderBy: { student: { rollNumber: 'asc' } } }),
    prisma.attendanceRecord.findMany({ where: { session: { courseId } } }),
  ]);

  const recordsBySessionAndStudent = new Map<string, string>();
  for (const r of records) {
    recordsBySessionAndStudent.set(`${r.sessionId}:${r.studentId}`, r.status);
  }

  return {
    sessions,
    students: enrollments.map((e) => e.student),
    recordsBySessionAndStudent,
  };
}

export async function courseAttendanceSummary(courseId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { student: true },
  });

  const summaries = await Promise.all(
    enrollments.map(async (e) => {
      const { total, present, percentage } = await attendanceForStudent(e.studentId, courseId);
      return { student: e.student, total, present, percentage };
    }),
  );

  return summaries;
}

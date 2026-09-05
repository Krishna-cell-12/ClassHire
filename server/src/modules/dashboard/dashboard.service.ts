import { FeeStatus, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { computeRiskForStudents } from '../risk/risk.service';
import { computeFeeStandingForStudents, computeFeeStatusForStudent } from '../fees/fees.service';

/** Attendance below this is the exam-eligibility cutoff the UI flags on. */
export const ATTENDANCE_THRESHOLD = 75;

const PRESENT_STATUSES = ['PRESENT', 'LATE'] as const;

function pct(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/* ── Attendance trend, by department and month ───────────────────────────────
 * Grouping spans AttendanceRecord -> Session -> Course -> Department, which
 * Prisma's groupBy can't express, so this is one raw aggregate. It takes no
 * user input -- there is nothing interpolated into the statement.
 * ─────────────────────────────────────────────────────────────────────────── */
interface TrendRow {
  dept: string;
  month: string;
  total: number;
  present: number;
}

async function attendanceByDepartmentAndMonth(): Promise<TrendRow[]> {
  return prisma.$queryRaw<TrendRow[]>`
    SELECT d.code AS dept,
           to_char(s."date", 'YYYY-MM') AS month,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE r.status IN ('PRESENT', 'LATE'))::int AS present
    FROM "AttendanceRecord" r
    JOIN "AttendanceSession" s ON s.id = r."sessionId"
    JOIN "Course" c ON c.id = s."courseId"
    JOIN "Department" d ON d.id = c."departmentId"
    GROUP BY d.code, month
    ORDER BY month ASC, d.code ASC
  `;
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

export async function adminOverview() {
  const [students, departments, facultyCount, courseCount, trendRows, gradeRows] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rollNumber: true,
        currentSemester: true,
        departmentId: true,
        department: { select: { code: true, name: true } },
      },
      orderBy: { rollNumber: 'asc' },
    }),
    prisma.department.findMany({ orderBy: { code: 'asc' } }),
    prisma.faculty.count({ where: { isActive: true } }),
    prisma.course.count(),
    attendanceByDepartmentAndMonth(),
    prisma.resultMark.groupBy({ by: ['grade'], _count: { _all: true } }),
  ]);

  const studentIds = students.map((s) => s.id);
  const [riskById, feeById] = await Promise.all([
    computeRiskForStudents(studentIds),
    computeFeeStandingForStudents(studentIds),
  ]);

  // Attendance: averaged over students who actually have records.
  const attendancePercentages: number[] = [];
  let belowThreshold = 0;
  for (const id of studentIds) {
    const p = riskById.get(id)?.factors.attendance.percentage;
    if (p === null || p === undefined) continue;
    attendancePercentages.push(p);
    if (p < ATTENDANCE_THRESHOLD) belowThreshold += 1;
  }

  // Fees, overall and per department.
  const byDept = new Map<string, { billed: number; collected: number; defaulters: number }>();
  let billed = 0;
  let collected = 0;
  let defaulters = 0;
  let overdue = 0;

  for (const student of students) {
    const fee = feeById.get(student.id);
    if (!fee) continue;

    const acc = byDept.get(student.departmentId) ?? { billed: 0, collected: 0, defaulters: 0 };
    acc.billed += fee.total;
    acc.collected += fee.paid;
    billed += fee.total;
    collected += fee.paid;

    if (fee.status !== FeeStatus.PAID) {
      defaulters += 1;
      acc.defaulters += 1;
    }
    if (fee.status === FeeStatus.OVERDUE) overdue += 1;

    byDept.set(student.departmentId, acc);
  }

  // Risk buckets + the worst offenders for the dashboard's shortlist.
  const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const id of studentIds) {
    const level = riskById.get(id)?.level;
    if (level) riskCounts[level] += 1;
  }

  const topRisk = students
    .map((s) => ({ student: s, risk: riskById.get(s.id)! }))
    .filter((r) => r.risk)
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 6)
    .map(({ student, risk }) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      department: student.department.code,
      semester: student.currentSemester,
      score: risk.score,
      level: risk.level,
      reason: risk.reason,
    }));

  // Trend: one row per month, one key per department code, so the area chart can
  // map straight over it without reshaping on the client.
  const months = [...new Set(trendRows.map((r) => r.month))].sort();
  const attendanceTrend = months.map((month) => {
    const point: Record<string, string | number> = { month };
    for (const row of trendRows.filter((r) => r.month === month)) {
      point[row.dept] = pct(row.present, row.total);
    }
    return point;
  });

  const attendanceByDepartment = departments.map((d) => {
    const rows = trendRows.filter((r) => r.dept === d.code);
    const total = rows.reduce((a, r) => a + r.total, 0);
    const present = rows.reduce((a, r) => a + r.present, 0);
    return { code: d.code, name: d.name, percentage: pct(present, total) };
  });

  return {
    role: Role.ADMIN,
    totals: {
      students: students.length,
      faculty: facultyCount,
      courses: courseCount,
      departments: departments.length,
    },
    attendance: {
      average: average(attendancePercentages),
      belowThreshold,
      threshold: ATTENDANCE_THRESHOLD,
    },
    fees: {
      billed: Math.round(billed),
      collected: Math.round(collected),
      collectionPct: pct(collected, billed),
      defaulters,
      overdue,
    },
    risk: { ...riskCounts, total: students.length },
    topRisk,
    attendanceTrend,
    attendanceByDepartment,
    departmentCodes: departments.map((d) => d.code),
    feeByDepartment: departments
      .map((d) => {
        const acc = byDept.get(d.id) ?? { billed: 0, collected: 0, defaulters: 0 };
        return {
          code: d.code,
          name: d.name,
          billed: Math.round(acc.billed),
          collected: Math.round(acc.collected),
          percentage: pct(acc.collected, acc.billed),
          defaulters: acc.defaulters,
        };
      })
      .filter((d) => d.billed > 0),
    gradeDistribution: gradeRows
      .filter((g): g is typeof g & { grade: string } => g.grade !== null)
      .map((g) => ({ grade: g.grade, count: g._count._all }))
      .sort((a, b) => a.grade.localeCompare(b.grade)),
  };
}

/* ── Faculty ─────────────────────────────────────────────────────────────── */

export async function facultyOverview(userId: string) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    include: { department: true },
  });
  if (!faculty) throw AppError.forbidden('No faculty profile linked to this account');

  const courses = await prisma.course.findMany({
    where: { facultyId: faculty.id },
    include: { department: { select: { code: true } } },
    orderBy: [{ semester: 'asc' }, { name: 'asc' }],
  });
  const courseIds = courses.map((c) => c.id);

  const [sessions, enrollments] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true, date: true },
      orderBy: { date: 'asc' },
    }),
    prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, studentId: true },
    }),
  ]);

  const recordRows = await prisma.attendanceRecord.groupBy({
    by: ['sessionId', 'status'],
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    _count: { _all: true },
  });

  const courseOfSession = new Map(sessions.map((s) => [s.id, s.courseId]));
  const tallyByCourse = new Map<string, { total: number; present: number }>();
  for (const row of recordRows) {
    const courseId = courseOfSession.get(row.sessionId);
    if (!courseId) continue;
    const acc = tallyByCourse.get(courseId) ?? { total: 0, present: 0 };
    acc.total += row._count._all;
    if ((PRESENT_STATUSES as readonly string[]).includes(row.status)) acc.present += row._count._all;
    tallyByCourse.set(courseId, acc);
  }

  const enrolledByCourse = new Map<string, number>();
  for (const e of enrollments) {
    enrolledByCourse.set(e.courseId, (enrolledByCourse.get(e.courseId) ?? 0) + 1);
  }
  const sessionsByCourse = new Map<string, number>();
  for (const s of sessions) {
    sessionsByCourse.set(s.courseId, (sessionsByCourse.get(s.courseId) ?? 0) + 1);
  }

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  const riskById = await computeRiskForStudents(studentIds);

  const attendancePercentages: number[] = [];
  let belowThreshold = 0;
  let atRisk = 0;
  for (const id of studentIds) {
    const risk = riskById.get(id);
    if (!risk) continue;
    if (risk.level === 'HIGH' || risk.level === 'MEDIUM') atRisk += 1;
    const p = risk.factors.attendance.percentage;
    if (p === null) continue;
    attendancePercentages.push(p);
    if (p < ATTENDANCE_THRESHOLD) belowThreshold += 1;
  }

  return {
    role: Role.FACULTY,
    faculty: {
      id: faculty.id,
      name: `${faculty.firstName} ${faculty.lastName}`,
      department: faculty.department.code,
      designation: faculty.designation,
    },
    totals: { courses: courses.length, students: studentIds.length },
    attendance: {
      average: average(attendancePercentages),
      belowThreshold,
      threshold: ATTENDANCE_THRESHOLD,
    },
    atRisk,
    courses: courses.map((c) => {
      const tally = tallyByCourse.get(c.id) ?? { total: 0, present: 0 };
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        semester: c.semester,
        credits: c.credits,
        enrolled: enrolledByCourse.get(c.id) ?? 0,
        sessions: sessionsByCourse.get(c.id) ?? 0,
        percentage: pct(tally.present, tally.total),
      };
    }),
  };
}

/* ── Student ─────────────────────────────────────────────────────────────────
 * Deliberately no risk score. Risk is an admin/faculty concept and a student must
 * not learn their own -- same rule the students summary endpoint enforces.
 * ─────────────────────────────────────────────────────────────────────────── */

export async function studentOverview(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { department: true },
  });
  if (!student) throw AppError.forbidden('No student profile linked to this account');

  const [records, marks, feeStatus] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      select: { status: true, session: { select: { courseId: true, course: { select: { code: true, name: true } } } } },
    }),
    prisma.resultMark.findMany({
      where: { studentId: student.id },
      include: { exam: { include: { course: { select: { code: true, name: true } } } } },
      orderBy: { exam: { examDate: 'desc' } },
    }),
    computeFeeStatusForStudent(student.id),
  ]);

  const byCourse = new Map<string, { code: string; name: string; total: number; present: number }>();
  let total = 0;
  let present = 0;
  for (const r of records) {
    total += 1;
    const isPresent = (PRESENT_STATUSES as readonly string[]).includes(r.status);
    if (isPresent) present += 1;

    const acc = byCourse.get(r.session.courseId) ?? {
      code: r.session.course.code,
      name: r.session.course.name,
      total: 0,
      present: 0,
    };
    acc.total += 1;
    if (isPresent) acc.present += 1;
    byCourse.set(r.session.courseId, acc);
  }

  const percentage = total === 0 ? null : pct(present, total);

  const examPercentages = marks.map((m) => (Number(m.marksObtained) / Number(m.exam.maxMarks)) * 100);

  // Average exam score per course -- what the "performance by subject" chart plots.
  const scoreByCourse = new Map<string, { code: string; name: string; sum: number; count: number }>();
  for (const m of marks) {
    const key = m.exam.courseId;
    const acc = scoreByCourse.get(key) ?? { code: m.exam.course.code, name: m.exam.course.name, sum: 0, count: 0 };
    acc.sum += (Number(m.marksObtained) / Number(m.exam.maxMarks)) * 100;
    acc.count += 1;
    scoreByCourse.set(key, acc);
  }

  return {
    role: Role.STUDENT,
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      department: student.department.code,
      semester: student.currentSemester,
      batchYear: student.batchYear,
    },
    attendance: {
      percentage,
      total,
      present,
      threshold: ATTENDANCE_THRESHOLD,
      eligible: percentage === null ? null : percentage >= ATTENDANCE_THRESHOLD,
    },
    fees: feeStatus
      ? {
          status: feeStatus.status,
          total: feeStatus.total,
          paid: feeStatus.paid,
          pending: feeStatus.pending,
          dueDate: feeStatus.slab.dueDate,
        }
      : null,
    academics: {
      averagePercentage: average(examPercentages),
      totalExams: marks.length,
    },
    courses: [...byCourse.values()].map((c) => ({
      code: c.code,
      name: c.name,
      total: c.total,
      present: c.present,
      percentage: pct(c.present, c.total),
    })),
    scoreByCourse: [...scoreByCourse.values()].map((c) => ({
      code: c.code,
      name: c.name,
      percentage: Math.round((c.sum / c.count) * 10) / 10,
    })),
    recentResults: marks.slice(0, 8).map((m) => ({
      id: m.id,
      courseCode: m.exam.course.code,
      courseName: m.exam.course.name,
      examTitle: m.exam.title,
      examType: m.exam.examType,
      examDate: m.exam.examDate,
      marksObtained: Number(m.marksObtained),
      maxMarks: Number(m.exam.maxMarks),
      grade: m.grade,
    })),
  };
}

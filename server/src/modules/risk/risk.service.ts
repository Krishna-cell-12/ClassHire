import { FeeStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginationMeta } from '../../utils/pagination';
import { RiskListQuery } from './risk.schema';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskResult {
  score: number;
  level: RiskLevel;
  reason: string;
  factors: {
    attendance: { percentage: number | null; subScore: number };
    fees: { daysOverdue: number; pendingAmount: number; status: FeeStatus | null; subScore: number };
    grades: { trendPoints: number | null; subScore: number };
  };
}

// Weights: attendance shortage 40%, fee delay 35%, grade trend 25%.
const WEIGHTS = { attendance: 0.4, fees: 0.35, grades: 0.25 };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Linear: 100% attendance -> 0 risk, 0% attendance -> 100 risk.
function attendanceSubScore(percentage: number | null): number {
  if (percentage === null) return 0;
  return clamp(100 - percentage, 0, 100);
}

// Primary signal is days overdue (0 if not yet overdue -> no risk from this factor).
// Scaled by how much of the slab is still unpaid, since every seeded fee slab shares one
// fixed due date -- every non-fully-paid student is ~230+ days overdue as of today, so raw
// days-overdue alone doesn't differentiate a student who owes a small remainder from one who
// has paid nothing. Weighting by the unpaid fraction restores that distinction using data
// that does vary, while still gating entirely on "is this actually overdue".
function feeSubScore(daysOverdue: number, pendingRatio: number): number {
  if (daysOverdue <= 0) return 0;
  const overdueSeverity = clamp(daysOverdue * 2, 0, 100); // saturates at 50 days overdue
  return clamp(overdueSeverity * pendingRatio, 0, 100);
}

// Trend is "recent exam vs. this student's own earlier exams in the same course" (see
// gradeTrendFromMarks). Negative trend = declining = risk; flat/improving = no risk.
function gradeSubScore(trendPoints: number | null): number {
  if (trendPoints === null || trendPoints >= 0) return 0;
  return clamp(-trendPoints * 7, 0, 100);
}

function bucketLevel(score: number): RiskLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function buildReason(
  percentage: number | null,
  attScore: number,
  daysOverdue: number,
  feeStatus: FeeStatus | null,
  feeScore: number,
  trendPoints: number | null,
  gradeScore: number,
): string {
  const parts: string[] = [];

  if (percentage !== null && attScore >= 20) {
    parts.push(`attendance is ${percentage}%`);
  }
  if (feeScore >= 10) {
    parts.push(`fees ${feeStatus?.toLowerCase() ?? 'overdue'} by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`);
  }
  if (trendPoints !== null && gradeScore >= 15) {
    parts.push(`grades down ${Math.abs(Math.round(trendPoints))} points vs. their own average`);
  }

  if (parts.length === 0) return 'No significant risk factors';
  return parts.map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join(', ');
}

/* ── The one formula ─────────────────────────────────────────────────────────
 * Everything the score depends on, already reduced to plain numbers. Both the
 * single-student path and the bulk path below assemble this shape and hand it to
 * riskFromInputs(), so there is exactly one place the weights and thresholds
 * live -- the dashboard and the risk radar can never drift apart.
 * ─────────────────────────────────────────────────────────────────────────── */
export interface RiskInputs {
  /** Attendance record counts. `total: 0` means "no records" -> percentage is null. */
  attendance: { total: number; present: number };
  /** The student's applicable fee slab, or null when no slab covers them. */
  fee: { total: number; paid: number; dueDate: Date } | null;
  /** One entry per result mark, as a percentage of that exam's max marks. */
  marks: Array<{ courseId: string; date: Date; pct: number }>;
}

function attendancePercentage(attendance: RiskInputs['attendance']): number | null {
  if (attendance.total === 0) return null;
  return Math.round((attendance.present / attendance.total) * 1000) / 10;
}

function feeStatusFor(fee: NonNullable<RiskInputs['fee']>, now: Date): FeeStatus {
  if (fee.paid >= fee.total) return FeeStatus.PAID;
  if (fee.paid > 0) return FeeStatus.PARTIAL;
  if (now > fee.dueDate) return FeeStatus.OVERDUE;
  return FeeStatus.PENDING;
}

/**
 * Per-course: most recent exam (%) vs. the average of that student's earlier exams in the
 * same course, sorted by actual exam date. Averaged across all courses with 2+ data points.
 * Returns null if the student has no course with enough exams to compare.
 */
function gradeTrendFromMarks(marks: RiskInputs['marks']): number | null {
  const byCourse = new Map<string, Array<{ date: Date; pct: number }>>();
  for (const m of marks) {
    const list = byCourse.get(m.courseId) ?? [];
    list.push({ date: m.date, pct: m.pct });
    byCourse.set(m.courseId, list);
  }

  const courseTrends: number[] = [];
  for (const list of byCourse.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    const recent = list[list.length - 1].pct;
    const priorAvg = list.slice(0, -1).reduce((sum, x) => sum + x.pct, 0) / (list.length - 1);
    courseTrends.push(recent - priorAvg);
  }

  if (courseTrends.length === 0) return null;
  return courseTrends.reduce((a, b) => a + b, 0) / courseTrends.length;
}

export function riskFromInputs(inputs: RiskInputs, now = new Date()): RiskResult {
  const percentage = attendancePercentage(inputs.attendance);
  const trendPoints = gradeTrendFromMarks(inputs.marks);

  const status = inputs.fee ? feeStatusFor(inputs.fee, now) : null;
  const isPaid = status === FeeStatus.PAID;
  const pending = inputs.fee ? Math.max(0, inputs.fee.total - inputs.fee.paid) : 0;
  const daysOverdue =
    inputs.fee && !isPaid ? Math.max(0, Math.floor((now.getTime() - inputs.fee.dueDate.getTime()) / MS_PER_DAY)) : 0;
  const pendingRatio = inputs.fee && !isPaid && inputs.fee.total > 0 ? pending / inputs.fee.total : 0;

  const attScore = attendanceSubScore(percentage);
  const feeScore = feeSubScore(daysOverdue, pendingRatio);
  const gradeScore = gradeSubScore(trendPoints);

  const score = Math.round(attScore * WEIGHTS.attendance + feeScore * WEIGHTS.fees + gradeScore * WEIGHTS.grades);

  return {
    score,
    level: bucketLevel(score),
    reason: buildReason(percentage, attScore, daysOverdue, status, feeScore, trendPoints, gradeScore),
    factors: {
      attendance: { percentage, subScore: Math.round(attScore) },
      fees: {
        daysOverdue,
        pendingAmount: inputs.fee ? Math.round(pending) : 0,
        status,
        subScore: Math.round(feeScore),
      },
      grades: { trendPoints: trendPoints !== null ? Math.round(trendPoints * 10) / 10 : null, subScore: Math.round(gradeScore) },
    },
  };
}

/* ── Single student ──────────────────────────────────────────────────────── */

export async function computeRiskForStudent(studentId: string): Promise<RiskResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { departmentId: true, currentSemester: true, batchYear: true },
  });
  if (!student) {
    // Caller-facing 404s come from the students service; an unknown id here just
    // scores as "no data" rather than throwing from inside a score computation.
    return riskFromInputs({ attendance: { total: 0, present: 0 }, fee: null, marks: [] });
  }

  const [records, slab, marks] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId },
      _count: { _all: true },
    }),
    prisma.feeSlab.findUnique({
      where: {
        departmentId_semester_batchYear: {
          departmentId: student.departmentId,
          semester: student.currentSemester,
          batchYear: student.batchYear,
        },
      },
    }),
    prisma.resultMark.findMany({
      where: { studentId },
      select: { marksObtained: true, exam: { select: { courseId: true, examDate: true, maxMarks: true } } },
    }),
  ]);

  let total = 0;
  let present = 0;
  for (const row of records) {
    total += row._count._all;
    if (row.status === 'PRESENT' || row.status === 'LATE') present += row._count._all;
  }

  let fee: RiskInputs['fee'] = null;
  if (slab) {
    const paid = await prisma.feePayment.aggregate({
      where: { feeSlabId: slab.id, studentId },
      _sum: { amountPaid: true },
    });
    fee = { total: Number(slab.totalAmount), paid: Number(paid._sum.amountPaid ?? 0), dueDate: slab.dueDate };
  }

  return riskFromInputs({
    attendance: { total, present },
    fee,
    marks: marks.map((m) => ({
      courseId: m.exam.courseId,
      date: m.exam.examDate,
      pct: (Number(m.marksObtained) / Number(m.exam.maxMarks)) * 100,
    })),
  });
}

/* ── Every student, in a fixed number of queries ─────────────────────────── */

/**
 * Risk for many students at once. Ten thousand per-student queries is what a
 * naive loop costs on a seeded database; this collapses the same computation
 * into six set-based queries and does the arithmetic in memory, then routes it
 * through the identical riskFromInputs() the single-student path uses.
 */
export async function computeRiskForStudents(studentIds?: string[]): Promise<Map<string, RiskResult>> {
  const idFilter = studentIds ? { in: studentIds } : undefined;

  const [students, attendanceRows, slabs, paymentRows, markRows] = await Promise.all([
    prisma.student.findMany({
      where: { id: idFilter },
      select: { id: true, departmentId: true, currentSemester: true, batchYear: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: { studentId: idFilter },
      _count: { _all: true },
    }),
    prisma.feeSlab.findMany(),
    prisma.feePayment.groupBy({
      by: ['studentId', 'feeSlabId'],
      where: { studentId: idFilter },
      _sum: { amountPaid: true },
    }),
    prisma.resultMark.findMany({
      where: { studentId: idFilter },
      select: { studentId: true, marksObtained: true, exam: { select: { courseId: true, examDate: true, maxMarks: true } } },
    }),
  ]);

  const attendanceByStudent = new Map<string, { total: number; present: number }>();
  for (const row of attendanceRows) {
    const acc = attendanceByStudent.get(row.studentId) ?? { total: 0, present: 0 };
    acc.total += row._count._all;
    if (row.status === 'PRESENT' || row.status === 'LATE') acc.present += row._count._all;
    attendanceByStudent.set(row.studentId, acc);
  }

  // Fee slabs are keyed by (department, semester, batchYear) -- the same lookup
  // computeFeeStatusForStudent() does, just precomputed once for all students.
  const slabByKey = new Map<string, (typeof slabs)[number]>();
  for (const slab of slabs) {
    slabByKey.set(`${slab.departmentId}:${slab.semester}:${slab.batchYear}`, slab);
  }

  const paidByStudentAndSlab = new Map<string, number>();
  for (const row of paymentRows) {
    paidByStudentAndSlab.set(`${row.studentId}:${row.feeSlabId}`, Number(row._sum.amountPaid ?? 0));
  }

  const marksByStudent = new Map<string, RiskInputs['marks']>();
  for (const row of markRows) {
    const list = marksByStudent.get(row.studentId) ?? [];
    list.push({
      courseId: row.exam.courseId,
      date: row.exam.examDate,
      pct: (Number(row.marksObtained) / Number(row.exam.maxMarks)) * 100,
    });
    marksByStudent.set(row.studentId, list);
  }

  // One `now` for the whole batch, so two students in the same response can't be
  // scored against clocks a few milliseconds apart.
  const now = new Date();
  const out = new Map<string, RiskResult>();

  for (const student of students) {
    const slab = slabByKey.get(`${student.departmentId}:${student.currentSemester}:${student.batchYear}`);
    const fee: RiskInputs['fee'] = slab
      ? {
          total: Number(slab.totalAmount),
          paid: paidByStudentAndSlab.get(`${student.id}:${slab.id}`) ?? 0,
          dueDate: slab.dueDate,
        }
      : null;

    out.set(
      student.id,
      riskFromInputs(
        {
          attendance: attendanceByStudent.get(student.id) ?? { total: 0, present: 0 },
          fee,
          marks: marksByStudent.get(student.id) ?? [],
        },
        now,
      ),
    );
  }

  return out;
}

export async function listStudentRisk(query: RiskListQuery) {
  const students = await prisma.student.findMany({
    where: { isActive: true, departmentId: query.departmentId },
    include: { department: true },
    orderBy: { rollNumber: 'asc' },
  });

  const riskById = await computeRiskForStudents(students.map((s) => s.id));
  const withRisk = students.map((student) => ({
    student,
    risk: riskById.get(student.id) ?? riskFromInputs({ attendance: { total: 0, present: 0 }, fee: null, marks: [] }),
  }));

  const filtered = query.level ? withRisk.filter((r) => r.risk.level === query.level) : withRisk;

  filtered.sort((a, b) => (query.sort === 'score_asc' ? a.risk.score - b.risk.score : b.risk.score - a.risk.score));

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const data = filtered.slice(start, start + query.limit);

  // Bucket totals describe the whole (department-scoped) cohort, not just the
  // current page or the selected level -- the UI shows them as standing counts.
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const r of withRisk) counts[r.risk.level] += 1;

  return { data, meta: paginationMeta(query.page, query.limit, total), counts, cohortTotal: withRisk.length };
}

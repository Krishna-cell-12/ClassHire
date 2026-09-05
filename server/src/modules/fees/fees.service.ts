import { FeeStatus, Student, FeeSlab } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { CreateFeeSlabInput, CreatePaymentInput, UpdateFeeSlabInput } from './fees.schema';

function sumFees(input: { tuitionFee: number; labFee: number; libraryFee: number; otherFee: number }) {
  return input.tuitionFee + input.labFee + input.libraryFee + input.otherFee;
}

// Prisma's Decimal fields serialize to JSON as strings (via Decimal#toJSON), but the client
// types declare these as `number` -- left as strings, `rows.reduce((a, s) => a + s.totalAmount, 0)`
// silently does string concatenation instead of arithmetic. Coerce to numbers before responding.
function withNumericFees<T extends { tuitionFee: unknown; labFee: unknown; libraryFee: unknown; otherFee: unknown; totalAmount: unknown }>(
  slab: T,
) {
  return {
    ...slab,
    tuitionFee: Number(slab.tuitionFee),
    labFee: Number(slab.labFee),
    libraryFee: Number(slab.libraryFee),
    otherFee: Number(slab.otherFee),
    totalAmount: Number(slab.totalAmount),
  };
}

export async function listFeeSlabs(filters: { departmentId?: string; semester?: number; batchYear?: number }) {
  const slabs = await prisma.feeSlab.findMany({
    where: filters,
    include: { department: true },
    orderBy: [{ batchYear: 'desc' }, { semester: 'asc' }],
  });
  return slabs.map(withNumericFees);
}

export async function createFeeSlab(input: CreateFeeSlabInput) {
  const slab = await prisma.feeSlab.create({
    data: { ...input, totalAmount: sumFees(input) },
  });
  return withNumericFees(slab);
}

export async function updateFeeSlab(id: string, input: UpdateFeeSlabInput) {
  const existing = await prisma.feeSlab.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Fee slab not found');
  const merged = {
    tuitionFee: input.tuitionFee ?? Number(existing.tuitionFee),
    labFee: input.labFee ?? Number(existing.labFee),
    libraryFee: input.libraryFee ?? Number(existing.libraryFee),
    otherFee: input.otherFee ?? Number(existing.otherFee),
  };
  const slab = await prisma.feeSlab.update({
    where: { id },
    data: { ...input, totalAmount: sumFees(merged) },
  });
  return withNumericFees(slab);
}

/**
 * The single definition of "where does this student stand on this slab". Both the
 * per-student path and the bulk path below call it, so a student's status on the
 * fees page can never disagree with the same student's status in a dashboard roll-up.
 */
export function feeStandingFor(paid: number, total: number, dueDate: Date, now = new Date()) {
  let status: FeeStatus;
  if (paid >= total) status = FeeStatus.PAID;
  else if (paid > 0) status = FeeStatus.PARTIAL;
  else if (now > dueDate) status = FeeStatus.OVERDUE;
  else status = FeeStatus.PENDING;

  return { paid, total, pending: Math.max(0, total - paid), status };
}

async function statusForSlabAndStudent(feeSlabId: string, studentId: string) {
  const slab = await prisma.feeSlab.findUnique({ where: { id: feeSlabId } });
  if (!slab) throw AppError.notFound('Fee slab not found');

  const payments = await prisma.feePayment.findMany({ where: { feeSlabId, studentId } });
  const paid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

  return { slab, ...feeStandingFor(paid, Number(slab.totalAmount), slab.dueDate) };
}

export interface StudentFeeStanding {
  studentId: string;
  slabId: string;
  departmentId: string;
  total: number;
  paid: number;
  pending: number;
  status: FeeStatus;
  dueDate: Date;
}

/**
 * Fee standing for many students in a fixed number of queries. Students with no
 * applicable slab are simply absent from the map, matching
 * computeFeeStatusForStudent() returning null for them.
 */
export async function computeFeeStandingForStudents(studentIds?: string[]): Promise<Map<string, StudentFeeStanding>> {
  const idFilter = studentIds ? { in: studentIds } : undefined;

  const [students, slabs, paymentRows] = await Promise.all([
    prisma.student.findMany({
      where: { id: idFilter },
      select: { id: true, departmentId: true, currentSemester: true, batchYear: true },
    }),
    prisma.feeSlab.findMany(),
    prisma.feePayment.groupBy({
      by: ['studentId', 'feeSlabId'],
      where: { studentId: idFilter },
      _sum: { amountPaid: true },
    }),
  ]);

  const slabByKey = new Map<string, (typeof slabs)[number]>();
  for (const slab of slabs) {
    slabByKey.set(`${slab.departmentId}:${slab.semester}:${slab.batchYear}`, slab);
  }

  const paidByStudentAndSlab = new Map<string, number>();
  for (const row of paymentRows) {
    paidByStudentAndSlab.set(`${row.studentId}:${row.feeSlabId}`, Number(row._sum.amountPaid ?? 0));
  }

  const now = new Date();
  const out = new Map<string, StudentFeeStanding>();

  for (const student of students) {
    const slab = slabByKey.get(`${student.departmentId}:${student.currentSemester}:${student.batchYear}`);
    if (!slab) continue;

    const paid = paidByStudentAndSlab.get(`${student.id}:${slab.id}`) ?? 0;
    const standing = feeStandingFor(paid, Number(slab.totalAmount), slab.dueDate, now);

    out.set(student.id, {
      studentId: student.id,
      slabId: slab.id,
      departmentId: student.departmentId,
      dueDate: slab.dueDate,
      ...standing,
    });
  }

  return out;
}

export async function recordPayment(input: CreatePaymentInput) {
  const { status } = await statusForSlabAndStudent(input.feeSlabId, input.studentId);
  if (status === FeeStatus.PAID) {
    throw AppError.badRequest('This fee slab is already fully paid for this student');
  }

  const payment = await prisma.feePayment.create({
    data: { ...input, status },
  });

  const after = await statusForSlabAndStudent(input.feeSlabId, input.studentId);
  return { payment, ...after };
}

export function listPaymentsForStudent(studentId: string) {
  return prisma.feePayment.findMany({
    where: { studentId },
    include: { feeSlab: { include: { department: true } } },
    orderBy: { paymentDate: 'desc' },
  });
}

async function applicableFeeSlab(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw AppError.notFound('Student not found');

  return prisma.feeSlab.findUnique({
    where: {
      departmentId_semester_batchYear: {
        departmentId: student.departmentId,
        semester: student.currentSemester,
        batchYear: student.batchYear,
      },
    },
  });
}

export async function computeFeeStatusForStudent(studentId: string) {
  const slab = await applicableFeeSlab(studentId);
  if (!slab) return null;
  return statusForSlabAndStudent(slab.id, studentId);
}

export async function feeDefaulters(departmentId?: string) {
  const slabs = await prisma.feeSlab.findMany({ where: { departmentId } });
  const results: Array<{ student: Student; slab: FeeSlab; paid: number; pending: number; status: FeeStatus }> = [];

  for (const slab of slabs) {
    const students = await prisma.student.findMany({
      where: { departmentId: slab.departmentId, currentSemester: slab.semester, batchYear: slab.batchYear },
    });
    for (const student of students) {
      const { paid, pending, status } = await statusForSlabAndStudent(slab.id, student.id);
      if (status === FeeStatus.PENDING || status === FeeStatus.OVERDUE || status === FeeStatus.PARTIAL) {
        results.push({ student, slab, paid, pending, status });
      }
    }
  }

  return results;
}

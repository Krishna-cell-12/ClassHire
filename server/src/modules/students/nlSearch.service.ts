import { FeeStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginationMeta } from '../../utils/pagination';
import { computeRiskForStudents, RiskLevel } from '../risk/risk.service';
import { nameSearchClause } from './students.service';
import { callLlmForFilter } from './nlSearch.llm';
import { nlFilterSchema, NlFilter } from './nlSearch.schema';

export class NlSearchError extends Error {
  code: 'TIMEOUT' | 'PARSE_FAILED' | 'VALIDATION_FAILED' | 'UNKNOWN_DEPARTMENT' | 'EMPTY_FILTER';
  attempted: string | null;

  constructor(code: NlSearchError['code'], attempted: string | null) {
    super('Natural-language query could not be understood');
    this.code = code;
    this.attempted = attempted;
  }
}

const FEE_STATUS_MAP: Record<NonNullable<NlFilter['feeStatus']>, FeeStatus> = {
  paid: FeeStatus.PAID,
  partial: FeeStatus.PARTIAL,
  overdue: FeeStatus.OVERDUE,
};

const RISK_LEVEL_MAP: Record<NonNullable<NlFilter['riskLevel']>, RiskLevel> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

// In-memory cache of the LLM's raw output, keyed on the exact query string. Demo-only: no
// eviction beyond TTL, resets on server restart. Skips only the network round-trip to the LLM
// -- every request (cached or not) still re-runs full validation and a fresh DB query below,
// so a cache hit never bypasses the whitelist and never serves stale student data.
const CACHE_TTL_MS = 10 * 60 * 1000;
const llmRawCache = new Map<string, { raw: string; expiresAt: number }>();

async function getRawFilterText(query: string): Promise<string> {
  const cached = llmRawCache.get(query);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.raw;
  }

  const { raw, timedOut } = await callLlmForFilter(query);
  if (timedOut) {
    throw new NlSearchError('TIMEOUT', null);
  }

  llmRawCache.set(query, { raw, expiresAt: Date.now() + CACHE_TTL_MS });
  return raw;
}

/**
 * Step 1: get raw text from the LLM (or cache).
 * Step 2: JSON.parse it -- if that fails, the model didn't follow instructions; reject.
 * Step 3: validate against the whitelist schema (.strict(), every field typed/ranged/enumed).
 *         This is the actual security boundary -- nothing that fails this check ever reaches
 *         a database query.
 * Step 4: if a department was named, resolve it against real Department rows (case-insensitive
 *         code/name match) -- a hallucinated department name is rejected here, not guessed at.
 */
async function parseAndValidateFilter(query: string): Promise<{ filter: NlFilter; departmentId?: string; raw: string }> {
  const raw = await getRawFilterText(query);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new NlSearchError('PARSE_FAILED', raw);
  }

  const result = nlFilterSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new NlSearchError('VALIDATION_FAILED', raw);
  }

  const filter = result.data;

  let departmentId: string | undefined;
  if (filter.department) {
    const dept = await prisma.department.findFirst({
      where: {
        OR: [
          { code: { equals: filter.department, mode: 'insensitive' } },
          { name: { equals: filter.department, mode: 'insensitive' } },
          { name: { contains: filter.department, mode: 'insensitive' } },
        ],
      },
    });
    if (!dept) {
      throw new NlSearchError('UNKNOWN_DEPARTMENT', raw);
    }
    departmentId = dept.id;
  }

  return { filter, departmentId, raw };
}

export interface NlSearchResult {
  data: Array<{
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    department: { id: string; code: string; name: string } | null;
    currentSemester: number;
    batchYear: number;
    attendancePct: number | null;
    feeStatus: FeeStatus | null;
    riskLevel: RiskLevel;
    riskScore: number;
  }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
  filter: NlFilter;
}

export async function searchStudentsNaturalLanguage(query: string, page: number, limit: number): Promise<NlSearchResult> {
  const { filter, departmentId } = await parseAndValidateFilter(query);

  // Native Prisma fields only, built the same way listStudents() does it -- typed where
  // object, no string interpolation. isActive is hardcoded true and is NOT part of the
  // whitelist schema, so no LLM output can ever cause a deactivated student to appear here.
  const where: Prisma.StudentWhereInput = {
    isActive: true,
    departmentId,
    currentSemester: filter.semester,
    batchYear: filter.batchYear,
    ...(filter.name ? nameSearchClause(filter.name) : {}),
  };

  const candidates = await prisma.student.findMany({
    where,
    include: { department: true },
    orderBy: { rollNumber: 'asc' },
  });

  // attendance/fee/risk are computed values, not native Student columns, so they can't be
  // expressed as a Prisma `where` clause -- they're filtered in-memory here using the exact
  // same scoring the risk dashboard and student summary use. computeRiskForStudents() scores
  // the whole candidate set in a fixed number of queries and already derives attendance
  // percentage and fee status as part of the score, so all three values come from one pass.
  const riskById = await computeRiskForStudents(candidates.map((s) => s.id));
  const enriched = candidates.map((student) => {
    const risk = riskById.get(student.id)!;
    return {
      student,
      attendancePct: risk.factors.attendance.percentage,
      feeStatus: risk.factors.fees.status,
      risk,
    };
  });

  const filtered = enriched.filter(({ attendancePct, feeStatus, risk }) => {
    if (filter.attendanceBelow !== undefined && !(attendancePct !== null && attendancePct < filter.attendanceBelow)) return false;
    if (filter.attendanceAbove !== undefined && !(attendancePct !== null && attendancePct > filter.attendanceAbove)) return false;
    if (filter.feeStatus && feeStatus !== FEE_STATUS_MAP[filter.feeStatus]) return false;
    if (filter.riskLevel && risk.level !== RISK_LEVEL_MAP[filter.riskLevel]) return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const page_ = filtered.slice(start, start + limit).map(({ student, attendancePct, feeStatus, risk }) => ({
    id: student.id,
    rollNumber: student.rollNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    department: student.department,
    currentSemester: student.currentSemester,
    batchYear: student.batchYear,
    attendancePct,
    feeStatus,
    riskLevel: risk.level,
    riskScore: risk.score,
  }));

  return { data: page_, meta: paginationMeta(page, limit, total), filter };
}

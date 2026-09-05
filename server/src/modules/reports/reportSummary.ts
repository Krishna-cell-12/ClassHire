import { getActiveProvider } from '../students/nlSearch.providers';

const ATTENDANCE_THRESHOLD = 75;
// Generous budget deliberately: "thinking" models (e.g. gemini-3.6-flash) spend a large,
// variable chunk of maxOutputTokens on invisible reasoning tokens before the visible answer --
// observed anywhere from ~290 to ~900 thinking tokens for this exact 2-sentence prompt, and
// thinkingConfig overrides (thinkingBudget/thinkingLevel) either got rejected outright or didn't
// reliably cut that down in testing. A tight budget sized for the visible answer alone gets
// consumed entirely by thinking and the response comes back truncated mid-sentence
// (finishReason: MAX_TOKENS) -- looksComplete below catches that. Since the token cap doesn't
// reliably bound latency for this model anyway, TIMEOUT_MS (shared with NL search, 5s) is the
// real gate; this is just generous enough not to be the thing that cuts off an otherwise-
// completing response before the timeout would. When Gemini's thinking overhead does exceed 5s,
// the fallback template fires -- by design, not as an error case.
const SUMMARY_MAX_TOKENS = 1500;

// Deliberately generic (not the NL_SEARCH_SYSTEM_PROMPT): free plain-English prose, not JSON.
// The model only ever sees numbers this module has already computed -- it is never the source
// of a number, only asked to phrase ones it's given. "Do not invent" is instruction, not the
// safety boundary; the actual boundary is that computeAttendanceStats/computeFeeDefaultersStats
// run BEFORE this prompt is built, entirely independent of whatever the LLM returns.
const REPORT_SUMMARY_SYSTEM_PROMPT = `You write a short executive summary for a college administrator based on numbers they give you.

Rules:
- Write EXACTLY 2 sentences, plain English, no bullet points, no markdown, no headings.
- Use ONLY the numbers provided to you. Never invent, estimate, or infer any number not explicitly given.
- Do not add recommendations, opinions, or suggestions -- state facts only.
- Do not restate the raw data as a list -- synthesize it into natural prose.
- Output the 2 sentences only, nothing else (no preamble like "Here is the summary:").`;

export interface ExecutiveSummary {
  text: string;
  source: 'llm' | 'template';
}

/**
 * Calls the active LLM provider (LLM_PROVIDER=groq|gemini, same selection as NL search) with
 * the given already-computed data and a strict "don't invent numbers" prompt. On ANY failure --
 * unconfigured key, timeout, provider error, malformed/empty response -- falls back to the
 * caller-supplied template string instead of throwing. A report must never fail, or omit its
 * summary section, just because the LLM was unavailable.
 */
async function generateExecutiveSummary(dataDescription: string, fallback: string): Promise<ExecutiveSummary> {
  try {
    const provider = getActiveProvider();
    if (!provider.isConfigured()) {
      return { text: fallback, source: 'template' };
    }

    const { raw, timedOut } = await provider.complete(REPORT_SUMMARY_SYSTEM_PROMPT, dataDescription, {
      jsonMode: false,
      maxTokens: SUMMARY_MAX_TOKENS,
    });

    const text = raw?.trim();
    // A response cut off mid-sentence (e.g. a "thinking" model exhausting its token budget on
    // invisible reasoning before finishing the visible answer) is non-empty but not usable --
    // treat a missing sentence-ending punctuation as a failure too, not just an empty string.
    const looksComplete = !!text && /[.!?]$/.test(text);
    if (timedOut || !looksComplete) {
      return { text: fallback, source: 'template' };
    }

    return { text: text as string, source: 'llm' };
  } catch {
    return { text: fallback, source: 'template' };
  }
}

// ---------------------------------------------------------------------------
// Course attendance report
// ---------------------------------------------------------------------------

interface AttendanceSessionLike {
  id: string;
  date: Date;
}

interface AttendanceGridLike {
  sessions: AttendanceSessionLike[];
  students: Array<{ id: string }>;
  recordsBySessionAndStudent: Map<string, string>;
}

/**
 * Per-student attendance %, computed once here and reused both by the Excel generator (the '%'
 * column) and by computeAttendanceStats below -- previously this math lived only inline inside
 * the generator; extracting it means the report table and its summary can never disagree.
 */
export function computeAttendancePercentages(grid: AttendanceGridLike): Map<string, number> {
  const { sessions, students, recordsBySessionAndStudent } = grid;
  const pctByStudent = new Map<string, number>();

  for (const student of students) {
    let present = 0;
    for (const session of sessions) {
      const status = recordsBySessionAndStudent.get(`${session.id}:${student.id}`);
      if (status === 'PRESENT' || status === 'LATE') present += 1;
    }
    pctByStudent.set(student.id, sessions.length ? Math.round((present / sessions.length) * 1000) / 10 : 0);
  }

  return pctByStudent;
}

export interface AttendanceStats {
  courseCode: string;
  courseName: string;
  totalStudents: number;
  averagePct: number;
  belowThresholdCount: number;
  threshold: number;
  /** Second half of sessions minus first half, in percentage points. Positive = improving. */
  trendDelta: number;
}

function halfPresentRate(
  half: AttendanceSessionLike[],
  students: Array<{ id: string }>,
  recordsBySessionAndStudent: Map<string, string>,
): number {
  if (half.length === 0 || students.length === 0) return 0;
  let present = 0;
  for (const session of half) {
    for (const student of students) {
      const status = recordsBySessionAndStudent.get(`${session.id}:${student.id}`);
      if (status === 'PRESENT' || status === 'LATE') present += 1;
    }
  }
  return (present / (half.length * students.length)) * 100;
}

export function computeAttendanceStats(course: { code: string; name: string }, grid: AttendanceGridLike): AttendanceStats {
  const { sessions, students, recordsBySessionAndStudent } = grid;
  const totalStudents = students.length;

  if (totalStudents === 0 || sessions.length === 0) {
    return {
      courseCode: course.code,
      courseName: course.name,
      totalStudents,
      averagePct: 0,
      belowThresholdCount: 0,
      threshold: ATTENDANCE_THRESHOLD,
      trendDelta: 0,
    };
  }

  const pctByStudent = computeAttendancePercentages(grid);
  const pcts = [...pctByStudent.values()];
  const averagePct = Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10;
  const belowThresholdCount = pcts.filter((p) => p < ATTENDANCE_THRESHOLD).length;

  const mid = Math.floor(sessions.length / 2);
  const firstHalf = sessions.slice(0, mid);
  const secondHalf = sessions.slice(mid);
  const trendDelta =
    firstHalf.length && secondHalf.length
      ? Math.round(
          (halfPresentRate(secondHalf, students, recordsBySessionAndStudent) -
            halfPresentRate(firstHalf, students, recordsBySessionAndStudent)) *
            10,
        ) / 10
      : 0;

  return {
    courseCode: course.code,
    courseName: course.name,
    totalStudents,
    averagePct,
    belowThresholdCount,
    threshold: ATTENDANCE_THRESHOLD,
    trendDelta,
  };
}

function attendanceTrendPhrase(delta: number): string {
  if (delta === 0) return 'stable across the term';
  return `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} percentage points from the first half of the term to the second half`;
}

function buildAttendanceFallback(stats: AttendanceStats): string {
  return (
    `Average attendance in ${stats.courseCode} is ${stats.averagePct}%, ${attendanceTrendPhrase(stats.trendDelta)}. ` +
    `${stats.belowThresholdCount} of ${stats.totalStudents} students are below the ${stats.threshold}% threshold.`
  );
}

export async function getAttendanceExecutiveSummary(course: { code: string; name: string }, grid: AttendanceGridLike): Promise<ExecutiveSummary> {
  const stats = computeAttendanceStats(course, grid);
  const fallback = buildAttendanceFallback(stats);

  const dataDescription = [
    `Course: ${stats.courseCode} - ${stats.courseName}`,
    `Enrolled students: ${stats.totalStudents}`,
    `Average attendance: ${stats.averagePct}%`,
    `Attendance trend (first half of term vs. second half): ${stats.trendDelta >= 0 ? '+' : ''}${stats.trendDelta} percentage points`,
    `Students below ${stats.threshold}% attendance: ${stats.belowThresholdCount} of ${stats.totalStudents}`,
  ].join('\n');

  return generateExecutiveSummary(dataDescription, fallback);
}

// ---------------------------------------------------------------------------
// Fee defaulters report
// ---------------------------------------------------------------------------

interface DefaulterRowLike {
  student: { id: string };
  slab: { departmentId: string };
  pending: number;
}

export interface FeeDefaultersStats {
  scopeLabel: string;
  totalDefaulters: number;
  totalOverdue: number;
  /** Department with the highest defaulter RATE (defaulters / that department's total active
   *  students) among departments with at least one defaulter -- i.e. genuinely
   *  over-represented, not just the one with the most students overall. */
  concentration: { departmentCode: string; defaulterCount: number; ratePct: number } | null;
}

export function computeFeeDefaultersStats(
  rows: DefaulterRowLike[],
  departments: Array<{ id: string; code: string }>,
  totalStudentsByDepartment: Map<string, number>,
  scopeLabel: string,
): FeeDefaultersStats {
  const totalDefaulters = rows.length;
  const totalOverdue = Math.round(rows.reduce((sum, r) => sum + r.pending, 0));

  const defaulterCountByDept = new Map<string, number>();
  for (const row of rows) {
    defaulterCountByDept.set(row.slab.departmentId, (defaulterCountByDept.get(row.slab.departmentId) ?? 0) + 1);
  }

  let concentration: FeeDefaultersStats['concentration'] = null;
  for (const dept of departments) {
    const count = defaulterCountByDept.get(dept.id);
    const total = totalStudentsByDepartment.get(dept.id);
    if (!count || !total) continue;
    const ratePct = Math.round((count / total) * 1000) / 10;
    if (!concentration || ratePct > concentration.ratePct) {
      concentration = { departmentCode: dept.code, defaulterCount: count, ratePct };
    }
  }

  return { scopeLabel, totalDefaulters, totalOverdue, concentration };
}

function buildFeeDefaultersFallback(stats: FeeDefaultersStats): string {
  const concentrationPhrase = stats.concentration
    ? ` ${stats.concentration.departmentCode} is the most affected department, with ${stats.concentration.ratePct}% of its students in default.`
    : '';
  return `${stats.totalDefaulters} students (${stats.scopeLabel}) have outstanding fees totaling ${stats.totalOverdue}.${concentrationPhrase}`;
}

// ---------------------------------------------------------------------------
// Course result sheet
// ---------------------------------------------------------------------------

const PASS_THRESHOLD_RATIO = 0.4; // matches computeGrade's F cutoff in utils/grade.ts

interface ResultRowLike {
  marksObtained: number;
}

export interface ExamResultStats {
  courseCode: string;
  courseName: string;
  examTitle: string;
  examType: string;
  maxMarks: number;
  studentCount: number;
  averageMarks: number;
  averagePct: number;
  highest: number;
  lowest: number;
  failingCount: number;
}

export function computeExamResultStats(
  course: { code: string; name: string },
  exam: { title: string; examType: string; maxMarks: number },
  rows: ResultRowLike[],
): ExamResultStats {
  const marks = rows.map((r) => r.marksObtained);
  const studentCount = marks.length;
  const maxMarks = exam.maxMarks;

  const averageMarks = studentCount ? Math.round((marks.reduce((a, b) => a + b, 0) / studentCount) * 10) / 10 : 0;
  const highest = studentCount ? Math.max(...marks) : 0;
  const lowest = studentCount ? Math.min(...marks) : 0;
  const failingCount = marks.filter((m) => m < maxMarks * PASS_THRESHOLD_RATIO).length;

  return {
    courseCode: course.code,
    courseName: course.name,
    examTitle: exam.title,
    examType: exam.examType,
    maxMarks,
    studentCount,
    averageMarks,
    averagePct: maxMarks ? Math.round((averageMarks / maxMarks) * 1000) / 10 : 0,
    highest,
    lowest,
    failingCount,
  };
}

function buildExamResultFallback(stats: ExamResultStats): string {
  const failPhrase = stats.failingCount > 0 ? ` ${stats.failingCount} of ${stats.studentCount} students scored below the passing threshold.` : '';
  return (
    `Class average for ${stats.examTitle} in ${stats.courseCode} was ${stats.averageMarks} out of ${stats.maxMarks} (${stats.averagePct}%), ` +
    `ranging from ${stats.lowest} to ${stats.highest}.${failPhrase}`
  );
}

export async function getExamResultExecutiveSummary(
  course: { code: string; name: string },
  exam: { title: string; examType: string; maxMarks: number },
  rows: ResultRowLike[],
): Promise<ExecutiveSummary> {
  const stats = computeExamResultStats(course, exam, rows);
  const fallback = buildExamResultFallback(stats);

  const dataDescription = [
    `Course: ${stats.courseCode} - ${stats.courseName}`,
    `Exam: ${stats.examTitle} (${stats.examType}), max marks ${stats.maxMarks}`,
    `Students with a recorded mark: ${stats.studentCount}`,
    `Class average: ${stats.averageMarks} / ${stats.maxMarks} (${stats.averagePct}%)`,
    `Highest: ${stats.highest}, Lowest: ${stats.lowest}`,
    `Students below the passing threshold (${Math.round(PASS_THRESHOLD_RATIO * 100)}% of max marks): ${stats.failingCount}`,
  ].join('\n');

  return generateExecutiveSummary(dataDescription, fallback);
}

export async function getFeeDefaultersExecutiveSummary(
  rows: DefaulterRowLike[],
  departments: Array<{ id: string; code: string }>,
  totalStudentsByDepartment: Map<string, number>,
  scopeLabel: string,
): Promise<ExecutiveSummary> {
  const stats = computeFeeDefaultersStats(rows, departments, totalStudentsByDepartment, scopeLabel);
  const fallback = buildFeeDefaultersFallback(stats);

  const dataDescription = [
    `Report scope: ${stats.scopeLabel}`,
    `Total students with outstanding fees: ${stats.totalDefaulters}`,
    `Total amount overdue across all defaulters: ${stats.totalOverdue}`,
    stats.concentration
      ? `Most affected department: ${stats.concentration.departmentCode}, ${stats.concentration.defaulterCount} defaulters, ${stats.concentration.ratePct}% of that department's students`
      : 'No single department stands out -- defaulters are spread across departments.',
  ].join('\n');

  return generateExecutiveSummary(dataDescription, fallback);
}

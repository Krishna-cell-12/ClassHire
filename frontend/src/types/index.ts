/**
 * Mirrors the Express API's response shapes (server/src/modules/**).
 *
 * Two conventions worth knowing before editing:
 *  - Every id is a UUID string, never a number.
 *  - Dates arrive as ISO strings, because that is what JSON gives us; parse at
 *    the point of display rather than storing Date objects in state.
 */

export type Role = 'ADMIN' | 'FACULTY' | 'STUDENT'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
export type ExamType = 'MIDTERM' | 'FINAL' | 'QUIZ' | 'ASSIGNMENT'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/** `{ data, meta }` — the envelope every paginated list endpoint returns. */
export interface Paginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface Department {
  id: string
  name: string
  code: string
}

export interface Student {
  id: string
  userId: string
  rollNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: Gender
  phone: string | null
  address: string | null
  departmentId: string
  department?: Department
  currentSemester: number
  batchYear: number
  admissionDate: string
  isActive: boolean
  user?: { email: string; isActive: boolean }
}

/**
 * A row from `GET /api/students`. The list endpoint enriches each student with
 * attendance and fee standing (computed values, not Student columns) so the
 * directory can show them without a request per row.
 */
export interface StudentListRow extends Student {
  department: Department
  attendancePct: number | null
  attendedSessions: number
  totalSessions: number
  feeStatus: FeeStatus | null
  feePending: number | null
  feeTotal: number | null
  feePaid: number | null
  feeSlabId: string | null
  feeDueDate: string | null
}

export interface Faculty {
  id: string
  userId: string
  employeeCode: string
  firstName: string
  lastName: string
  phone: string | null
  departmentId: string
  department?: Department
  designation: string | null
  isActive: boolean
  user?: { email: string; isActive: boolean }
}

export interface Course {
  id: string
  code: string
  name: string
  departmentId: string
  department?: Department
  semester: number
  credits: number
  facultyId: string | null
  faculty?: Faculty | null
}

/* ── Auth ─────────────────────────────────────────────────────────────────── */

export interface LoginResponse {
  token: string
  user: { id: string; email: string; role: Role }
}

/** Raw `GET /api/auth/me`. Flattened into `CurrentUser` by the auth context. */
export interface MeResponse {
  id: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
  student: (Student & { department: Department }) | null
  faculty: (Faculty & { department: Department }) | null
}

/**
 * What the UI actually needs about the signed-in person. `studentId`/`facultyId`
 * are the *profile* ids — distinct from `id`, which is the User row. Endpoints
 * such as `/api/fees/students/:studentId/status` want the profile id.
 */
export interface CurrentUser {
  id: string
  email: string
  role: Role
  name: string
  department?: string
  departmentId?: string
  studentId?: string
  facultyId?: string
}

/* ── Attendance ───────────────────────────────────────────────────────────── */

export interface AttendanceSession {
  id: string
  courseId: string
  date: string
  topic: string | null
  createdAt: string
  _count?: { records: number }
}

export interface AttendanceRecord {
  id: string
  sessionId: string
  studentId: string
  status: AttendanceStatus
  markedAt: string
  session?: AttendanceSession & { course: Course }
}

/** `GET /api/attendance/students/:studentId` */
export interface StudentAttendance {
  records: AttendanceRecord[]
  total: number
  present: number
  percentage: number | null
}

/** One row of `GET /api/attendance/courses/:courseId/summary` */
export interface CourseAttendanceSummary {
  student: Student
  total: number
  present: number
  percentage: number | null
}

/* ── Fees ─────────────────────────────────────────────────────────────────── */

export interface FeeSlab {
  id: string
  departmentId: string
  department?: Department
  semester: number
  batchYear: number
  tuitionFee: number
  labFee: number
  libraryFee: number
  otherFee: number
  totalAmount: number
  dueDate: string
}

export interface FeePayment {
  id: string
  studentId: string
  feeSlabId: string
  amountPaid: string | number
  paymentDate: string
  paymentMode: string | null
  transactionRef: string | null
  status: FeeStatus
  feeSlab?: FeeSlab & { department: Department }
}

/** `GET /api/fees/students/:studentId/status` — null when no slab covers them. */
export interface StudentFeeStatus {
  slab: FeeSlab
  paid: number
  total: number
  pending: number
  status: FeeStatus
}

/* ── Exams & results ──────────────────────────────────────────────────────── */

export interface Exam {
  id: string
  courseId: string
  course?: Course
  examType: ExamType
  title: string
  examDate: string
  maxMarks: string | number
  createdAt: string
}

export interface ResultMark {
  id: string
  examId: string
  studentId: string
  marksObtained: string | number
  grade: string | null
  remarks: string | null
  createdAt: string
  student?: Student
  exam?: Exam & { course: Course }
}

/* ── Risk ─────────────────────────────────────────────────────────────────── */

export interface RiskResult {
  score: number
  level: RiskLevel
  reason: string
  factors: {
    attendance: { percentage: number | null; subScore: number }
    fees: { daysOverdue: number; pendingAmount: number; status: FeeStatus | null; subScore: number }
    grades: { trendPoints: number | null; subScore: number }
  }
}

export interface RiskRow {
  student: Student & { department: Department }
  risk: RiskResult
}

/** `GET /api/risk` — bucket counts describe the whole cohort, not just the page. */
export interface RiskListResponse extends Paginated<RiskRow> {
  counts: Record<RiskLevel, number>
  cohortTotal: number
}

/* ── Natural-language search ──────────────────────────────────────────────── */

export interface NlStudentFilter {
  department?: string
  attendanceBelow?: number
  attendanceAbove?: number
  feeStatus?: 'paid' | 'partial' | 'overdue'
  riskLevel?: 'low' | 'medium' | 'high'
  semester?: number
  batchYear?: number
  name?: string
}

export interface NlSearchRow {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  department: Department | null
  currentSemester: number
  batchYear: number
  attendancePct: number | null
  feeStatus: FeeStatus | null
  riskLevel: RiskLevel
  riskScore: number
}

export interface NlSearchResponse extends Paginated<NlSearchRow> {
  filter: NlStudentFilter
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */

export interface AdminDashboard {
  role: 'ADMIN'
  totals: { students: number; faculty: number; courses: number; departments: number }
  attendance: { average: number | null; belowThreshold: number; threshold: number }
  fees: { billed: number; collected: number; collectionPct: number; defaulters: number; overdue: number }
  risk: Record<RiskLevel, number> & { total: number }
  topRisk: Array<{
    id: string
    name: string
    rollNumber: string
    department: string
    semester: number
    score: number
    level: RiskLevel
    reason: string
  }>
  /** One object per month: `{ month: '2026-06', CSE: 81.7, ECE: 81.3, … }` */
  attendanceTrend: Array<Record<string, string | number>>
  attendanceByDepartment: Array<{ code: string; name: string; percentage: number }>
  departmentCodes: string[]
  feeByDepartment: Array<{
    code: string
    name: string
    billed: number
    collected: number
    percentage: number
    defaulters: number
  }>
  gradeDistribution: Array<{ grade: string; count: number }>
}

export interface FacultyDashboard {
  role: 'FACULTY'
  faculty: { id: string; name: string; department: string; designation: string | null }
  totals: { courses: number; students: number }
  attendance: { average: number | null; belowThreshold: number; threshold: number }
  atRisk: number
  courses: Array<{
    id: string
    code: string
    name: string
    semester: number
    credits: number
    enrolled: number
    sessions: number
    percentage: number
  }>
}

export interface StudentDashboard {
  role: 'STUDENT'
  student: {
    id: string
    name: string
    rollNumber: string
    department: string
    semester: number
    batchYear: number
  }
  attendance: {
    percentage: number | null
    total: number
    present: number
    threshold: number
    eligible: boolean | null
  }
  fees: { status: FeeStatus; total: number; paid: number; pending: number; dueDate: string } | null
  academics: { averagePercentage: number | null; totalExams: number }
  courses: Array<{ code: string; name: string; total: number; present: number; percentage: number }>
  scoreByCourse: Array<{ code: string; name: string; percentage: number }>
  recentResults: Array<{
    id: string
    courseCode: string
    courseName: string
    examTitle: string
    examType: ExamType
    examDate: string
    marksObtained: number
    maxMarks: number
    grade: string | null
  }>
}

export type DashboardResponse = AdminDashboard | FacultyDashboard | StudentDashboard

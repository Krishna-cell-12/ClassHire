export type Role = 'ADMIN' | 'FACULTY' | 'STUDENT'

export interface CurrentUser {
  id: number
  name: string
  email: string
  role: Role
  department?: string
  avatarUrl?: string
}

export interface Department {
  id: number
  name: string
  code: string
}

export interface Subject {
  id: number
  name: string
  code: string
  departmentId: number
  semester: number
}

export interface Student {
  id: number
  userId: number
  name: string
  email: string
  rollNo: string
  department: string
  semester: number
  admissionYear: number
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT'

export interface AttendanceRecord {
  id: number
  studentId: number
  subjectId: number
  date: string
  status: AttendanceStatus
  markedBy: number
}

export type FeeStatus = 'PAID' | 'PENDING' | 'OVERDUE'

export interface FeeRecord {
  id: number
  studentId: number
  semester: number
  amountDue: number
  amountPaid: number
  dueDate: string
  status: FeeStatus
}

export interface ExamResult {
  id: number
  studentId: number
  subjectId: number
  semester: number
  marksObtained: number
  maxMarks: number
  grade: string
}

export type RiskBucket = 'LOW' | 'MEDIUM' | 'HIGH'

/** Computed server-side by the Risk Radar service - never user-entered. */
export interface RiskFlag {
  studentId: number
  rollNo: string
  name: string
  department: string
  semester: number
  score: number
  bucket: RiskBucket
  /** Plain-language explanations, e.g. "attendance 68%, below 75% eligibility". */
  reasons: string[]
  computedAt: string
}

/** The fixed schema the NL Query LLM must emit - no raw SQL ever leaves the model. */
export interface StudentFilter {
  department?: string
  semester?: number
  attendanceBelow?: number
  feeStatus?: FeeStatus
  riskBucket?: RiskBucket
  gradeBelow?: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

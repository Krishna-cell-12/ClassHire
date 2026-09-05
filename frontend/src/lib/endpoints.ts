/**
 * Every API call the app makes, in one place.
 *
 * Components import from here rather than touching `api` directly, so a route
 * change or a shape change is a one-line edit instead of a grep across features.
 */
import { api, downloadFile } from '@/lib/api'
import type {
  AttendanceStatus,
  Course,
  CourseAttendanceSummary,
  DashboardResponse,
  Department,
  Exam,
  Faculty,
  FeePayment,
  FeeSlab,
  LoginResponse,
  MeResponse,
  NlSearchResponse,
  Paginated,
  ResultMark,
  RiskListResponse,
  Student,
  StudentAttendance,
  StudentFeeStatus,
  StudentListRow,
  AttendanceSession,
} from '@/types'

/* ── Auth ─────────────────────────────────────────────────────────────────── */

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    return data
  },
  async me() {
    const { data } = await api.get<MeResponse>('/auth/me')
    return data
  },
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */

export const dashboardApi = {
  async overview() {
    const { data } = await api.get<DashboardResponse>('/dashboard')
    return data
  },
}

/* ── Reference data ───────────────────────────────────────────────────────── */

export const departmentsApi = {
  async list() {
    const { data } = await api.get<Department[]>('/departments')
    return data
  },
}

export const coursesApi = {
  async list(params: { departmentId?: string; semester?: number; facultyId?: string } = {}) {
    const { data } = await api.get<Course[]>('/courses', { params })
    return data
  },
  async students(courseId: string) {
    const { data } = await api.get<Student[]>(`/courses/${courseId}/students`)
    return data
  },
}

export const facultyApi = {
  async list(params: { page?: number; limit?: number; departmentId?: string } = {}) {
    const { data } = await api.get<Paginated<Faculty>>('/faculty', { params })
    return data
  },
}

/* ── Students ─────────────────────────────────────────────────────────────── */

export interface StudentListParams {
  page?: number
  limit?: number
  departmentId?: string
  semester?: number
  batchYear?: number
  search?: string
}

export const studentsApi = {
  async list(params: StudentListParams = {}) {
    const { data } = await api.get<Paginated<StudentListRow>>('/students', { params })
    return data
  },
  async get(id: string) {
    const { data } = await api.get<Student & { department: Department }>(`/students/${id}`)
    return data
  },
  async summary(id: string) {
    const { data } = await api.get(`/students/${id}/summary`)
    return data
  },
  async searchNl(query: string, page = 1, limit = 50) {
    const { data } = await api.post<NlSearchResponse>('/students/search-nl', { query, page, limit })
    return data
  },
}

/* ── Attendance ───────────────────────────────────────────────────────────── */

export const attendanceApi = {
  async sessions(courseId: string) {
    const { data } = await api.get<AttendanceSession[]>('/attendance/sessions', { params: { courseId } })
    return data
  },
  async createSession(input: { courseId: string; date: string; topic?: string }) {
    const { data } = await api.post<AttendanceSession>('/attendance/sessions', input)
    return data
  },
  async mark(sessionId: string, records: Array<{ studentId: string; status: AttendanceStatus }>) {
    const { data } = await api.post(`/attendance/sessions/${sessionId}/mark`, { records })
    return data
  },
  async forStudent(studentId: string) {
    const { data } = await api.get<StudentAttendance>(`/attendance/students/${studentId}`)
    return data
  },
  async courseSummary(courseId: string) {
    const { data } = await api.get<CourseAttendanceSummary[]>(`/attendance/courses/${courseId}/summary`)
    return data
  },
}

/* ── Fees ─────────────────────────────────────────────────────────────────── */

export const feesApi = {
  async slabs(params: { departmentId?: string; semester?: number; batchYear?: number } = {}) {
    const { data } = await api.get<Array<FeeSlab & { department: Department }>>('/fees/slabs', { params })
    return data
  },
  async payments(studentId: string) {
    const { data } = await api.get<FeePayment[]>('/fees/payments', { params: { studentId } })
    return data
  },
  async recordPayment(input: {
    studentId: string
    feeSlabId: string
    amountPaid: number
    paymentMode?: string
    transactionRef?: string
  }) {
    const { data } = await api.post('/fees/payments', input)
    return data
  },
  async studentStatus(studentId: string) {
    const { data } = await api.get<StudentFeeStatus | null>(`/fees/students/${studentId}/status`)
    return data
  },
}

/* ── Exams & results ──────────────────────────────────────────────────────── */

export const examsApi = {
  async list(courseId?: string) {
    const { data } = await api.get<Array<Exam & { course: Course }>>('/exams', {
      params: courseId ? { courseId } : {},
    })
    return data
  },
  async marks(examId: string) {
    const { data } = await api.get<Array<ResultMark & { student: Student }>>(`/exams/${examId}/marks`)
    return data
  },
  async enterMarks(examId: string, marks: Array<{ studentId: string; marksObtained: number; remarks?: string }>) {
    const { data } = await api.post(`/exams/${examId}/marks`, { marks })
    return data
  },
  async studentResults(studentId: string) {
    const { data } = await api.get<ResultMark[]>(`/exams/students/${studentId}/results`)
    return data
  },
}

/* ── Risk ─────────────────────────────────────────────────────────────────── */

export const riskApi = {
  async list(params: { level?: string; departmentId?: string; page?: number; limit?: number } = {}) {
    const { data } = await api.get<RiskListResponse>('/risk', { params })
    return data
  },
}

/* ── Reports ──────────────────────────────────────────────────────────────────
 * These stream PDF/XLSX bodies rather than JSON. downloadFile() handles the
 * bearer token and the filename, which a plain link cannot.
 * ─────────────────────────────────────────────────────────────────────────── */

export const reportsApi = {
  studentReportCard: (studentId: string, rollNumber = 'student') =>
    downloadFile(`/reports/students/${studentId}/report-card.pdf`, `report-card-${rollNumber}.pdf`),

  courseAttendance: (courseId: string, courseCode = 'course') =>
    downloadFile(`/reports/attendance/course/${courseId}.xlsx`, `attendance-${courseCode}.xlsx`),

  feeDefaulters: (departmentId?: string) =>
    downloadFile(
      departmentId ? `/reports/fees/defaulters.xlsx?departmentId=${departmentId}` : '/reports/fees/defaulters.xlsx',
      'fee-defaulters.xlsx',
    ),

  examResultSheet: (examId: string, courseCode = 'exam') =>
    downloadFile(`/reports/results/exam/${examId}.pdf`, `result-sheet-${courseCode}.pdf`),

  studentDirectory: () => downloadFile('/reports/students/export.xlsx', 'students.xlsx'),
}

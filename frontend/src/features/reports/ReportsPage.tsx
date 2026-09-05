import { useEffect, useState } from 'react'
import { BarChart3, CalendarCheck, Check, Download, FileText, Loader2, Sparkles, Users, Wallet } from 'lucide-react'
import { SectionHeading, ErrorState, LoadingPanel } from '@/components/ui/Shared'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Tilt3D, Layer } from '@/components/three-d/Tilt3D'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { useAuth } from '@/store/auth-context'
import { useApi } from '@/hooks/useApi'
import { coursesApi, departmentsApi, examsApi, reportsApi } from '@/lib/endpoints'
import { apiErrorMessage } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

type ReportId = 'attendance' | 'fees' | 'results' | 'directory' | 'reportCard'
type Status = 'idle' | 'working' | 'done' | 'error'

/**
 * One card per report the API can actually generate. `roles` mirrors the route
 * guards in server/src/modules/reports/reports.routes.ts — a card is only shown
 * to someone whose request would succeed.
 */
const REPORTS: Array<{
  id: ReportId
  title: string
  desc: string
  icon: typeof CalendarCheck
  color: string
  format: 'PDF' | 'Excel'
  roles: Array<'ADMIN' | 'FACULTY' | 'STUDENT'>
  /** Whether the card needs a picker before it can run. */
  needs?: 'course' | 'exam' | 'department'
  aiSummary?: boolean
}> = [
  {
    id: 'attendance',
    title: 'Course Attendance Sheet',
    desc: 'Session-by-session grid for one course, with per-student totals and eligibility flags.',
    icon: CalendarCheck,
    color: 'hsl(var(--neon-cyan))',
    format: 'Excel',
    roles: ['ADMIN', 'FACULTY'],
    needs: 'course',
    aiSummary: true,
  },
  {
    id: 'results',
    title: 'Exam Result Sheet',
    desc: 'Ranked marks and grades for a single exam, with distribution statistics.',
    icon: BarChart3,
    color: 'hsl(var(--risk-low))',
    format: 'PDF',
    roles: ['ADMIN', 'FACULTY'],
    needs: 'exam',
    aiSummary: true,
  },
  {
    id: 'fees',
    title: 'Fee Defaulters',
    desc: 'Every student with an outstanding balance, optionally scoped to one department.',
    icon: Wallet,
    color: 'hsl(var(--primary))',
    format: 'Excel',
    roles: ['ADMIN'],
    needs: 'department',
    aiSummary: true,
  },
  {
    id: 'directory',
    title: 'Student Directory',
    desc: 'Full student export with department, semester, batch and contact details.',
    icon: Users,
    color: 'hsl(var(--neon-violet))',
    format: 'Excel',
    roles: ['ADMIN'],
  },
  {
    id: 'reportCard',
    title: 'My Report Card',
    desc: 'Your attendance, fee standing and full exam history as a printable PDF.',
    icon: FileText,
    color: 'hsl(var(--primary))',
    format: 'PDF',
    roles: ['STUDENT'],
  },
]

export function ReportsPage() {
  const { user } = useAuth()
  const role = user?.role

  const [status, setStatus] = useState<Record<string, Status>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [courseId, setCourseId] = useState('')
  const [examId, setExamId] = useState('')
  const [departmentId, setDepartmentId] = useState('ALL')

  const isStaff = role === 'ADMIN' || role === 'FACULTY'

  const departments = useApi(() => (role === 'ADMIN' ? departmentsApi.list() : Promise.resolve([])), [role])
  const courses = useApi(
    () => (isStaff ? coursesApi.list(role === 'FACULTY' && user?.facultyId ? { facultyId: user.facultyId } : {}) : Promise.resolve([])),
    [isStaff, role, user?.facultyId],
  )

  useEffect(() => {
    if (!courseId && courses.data?.length) setCourseId(courses.data[0].id)
  }, [courses.data, courseId])

  const exams = useApi(() => (courseId ? examsApi.list(courseId) : Promise.resolve([])), [courseId])

  useEffect(() => {
    setExamId(exams.data?.[0]?.id ?? '')
  }, [exams.data])

  const selectedCourse = courses.data?.find((c) => c.id === courseId)
  const visible = REPORTS.filter((r) => role && r.roles.includes(role))

  async function run(id: ReportId) {
    setStatus((s) => ({ ...s, [id]: 'working' }))
    setErrors((e) => ({ ...e, [id]: '' }))
    try {
      switch (id) {
        case 'attendance':
          await reportsApi.courseAttendance(courseId, selectedCourse?.code)
          break
        case 'results':
          await reportsApi.examResultSheet(examId, selectedCourse?.code)
          break
        case 'fees':
          await reportsApi.feeDefaulters(departmentId === 'ALL' ? undefined : departmentId)
          break
        case 'directory':
          await reportsApi.studentDirectory()
          break
        case 'reportCard':
          if (!user?.studentId) throw new Error('No student profile linked to this account')
          await reportsApi.studentReportCard(user.studentId)
          break
      }
      setStatus((s) => ({ ...s, [id]: 'done' }))
      setTimeout(() => setStatus((s) => ({ ...s, [id]: 'idle' })), 3000)
    } catch (err) {
      setStatus((s) => ({ ...s, [id]: 'error' }))
      setErrors((e) => ({ ...e, [id]: apiErrorMessage(err) }))
    }
  }

  /** A card is only runnable once its picker has a value. */
  function blockedReason(report: (typeof REPORTS)[number]): string | null {
    if (report.needs === 'course' && !courseId) return 'No course available'
    if (report.needs === 'exam' && !examId) return 'No exam available for this course'
    if (report.id === 'reportCard' && !user?.studentId) return 'No student profile linked'
    return null
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Exports"
        title="Reports & Exports"
        icon={<FileText className="h-5 w-5" />}
        subtitle="Generate PDF and Excel reports straight from the database. Files are produced server-side."
      />

      {/* Pickers, shown only when a visible report needs them */}
      {isStaff && (
        <ScrollDepth>
          <Card tilt={false} elevation={2} className="mb-6">
            <CardHeader>
              <div>
                <CardTitle>Report Scope</CardTitle>
                <CardSubtitle>Applies to the course and exam reports below</CardSubtitle>
              </div>
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {(courses.data ?? []).length === 0 && <option value="">No courses</option>}
                {(courses.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Exam"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                disabled={(exams.data ?? []).length === 0}
              >
                {(exams.data ?? []).length === 0 && <option value="">No exams for this course</option>}
                {(exams.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {formatDate(e.examDate)}
                  </option>
                ))}
              </Select>

              {role === 'ADMIN' && (
                <Select label="Department (fees)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="ALL">All Departments</option>
                  {(departments.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </Card>
        </ScrollDepth>
      )}

      {courses.loading && isStaff && <LoadingPanel label="Loading report options…" />}
      {courses.error && isStaff && <ErrorState message={courses.error} onRetry={courses.refetch} />}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {visible.map((report, index) => {
          const Icon = report.icon
          const state = status[report.id] ?? 'idle'
          const blocked = blockedReason(report)
          return (
            <ScrollDepth key={report.id} index={index}>
              <Tilt3D max={6} lift={28} className="h-full">
                <div
                  className="panel panel-raised flex h-full flex-col gap-4 p-5"
                  style={{ ['--accent' as any]: report.color }}
                >
                  {/* Top edge accent — fades out before the rounded corners */}
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-[3px] rounded-b-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${report.color}, transparent)`,
                      boxShadow: `0 0 16px ${report.color}`,
                    }}
                  />

                  <Layer z={22} className="flex items-start gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-surface-raised/60"
                      style={{
                        color: report.color,
                        boxShadow: `0 0 22px -10px ${report.color}, inset 0 1px 0 rgb(255 255 255 / 0.08)`,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[15px] font-bold">{report.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{report.desc}</p>
                    </div>
                  </Layer>

                  {report.aiSummary && (
                    <Layer z={14}>
                      <div className="rounded-xl border border-neon-violet/22 bg-neon-violet/6 px-4 py-3">
                        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neon-violet">
                          <Sparkles className="h-3 w-3" /> Includes AI Summary
                        </p>
                        <p className="text-[12px] leading-relaxed text-muted-foreground">
                          An executive summary is written over the already-aggregated totals in this file — no raw
                          student records are sent to the model.
                        </p>
                      </div>
                    </Layer>
                  )}

                  {errors[report.id] && (
                    <p className="text-[11px] text-[hsl(var(--risk-high))]">{errors[report.id]}</p>
                  )}

                  {/* z=0: these are real buttons — see the note in Card.tsx for why a
                      nested nonzero-Z Layer would silently break their clicks. */}
                  <Layer z={0} className="mt-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={state === 'working' || Boolean(blocked)}
                      onClick={() => run(report.id)}
                    >
                      {state === 'working' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                        </>
                      ) : state === 'done' ? (
                        <>
                          <Check className="h-4 w-4" /> Downloaded
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> {report.format}
                        </>
                      )}
                    </Button>
                    {blocked && <span className="text-[11px] text-muted-foreground">{blocked}</span>}
                  </Layer>
                </div>
              </Tilt3D>
            </ScrollDepth>
          )
        })}
      </div>

      <ScrollDepth>
        <Card tilt={false} elevation={3}>
          <CardHeader>
            <div>
              <CardTitle>How These Are Generated</CardTitle>
              <CardSubtitle>Server-side, from live data</CardSubtitle>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {[
              'Every file is built on the API from the current database — PDFs with PDFKit, spreadsheets with ExcelJS. Nothing is generated from a cached snapshot.',
              'Downloads carry your bearer token, so the same role rules that guard the screens guard the files. A faculty account can only export its own courses.',
              'Narrative summaries run over aggregated totals only — percentages, counts and departmental averages. No student names or identifiers reach the model.',
            ].map((line, i) => (
              <div key={i} className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/14 font-display text-[10px] font-bold text-primary ring-1 ring-primary/25">
                  {i + 1}
                </span>
                <span className={cn('pt-0.5')}>{line}</span>
              </div>
            ))}
          </div>
        </Card>
      </ScrollDepth>
    </div>
  )
}

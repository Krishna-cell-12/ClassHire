import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, CheckCircle2, Download, XCircle } from 'lucide-react'
import { SectionHeading, StatTile, EmptyState, ErrorState, LoadingPanel, TableSkeleton } from '@/components/ui/Shared'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { Bar3D, MeterBar } from '@/components/three-d/Charts3D'
import { useAuth } from '@/store/auth-context'
import { useDepth } from '@/store/ui-context'
import { useApi } from '@/hooks/useApi'
import { attendanceApi, coursesApi, reportsApi } from '@/lib/endpoints'
import { apiErrorMessage } from '@/lib/api'
import { attendanceColor, cn, formatDate, fullName } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

const GREEN = 'hsl(var(--risk-low))'
const RED = 'hsl(var(--risk-high))'
const THRESHOLD = 75

/* ═══════════════════ Admin / Faculty ═══════════════════ */
function RegisterView({ facultyId }: { facultyId?: string }) {
  const depth = useDepth()
  const [courseId, setCourseId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Faculty see only their own courses; the API enforces the same rule, so
  // filtering here just avoids offering a choice that would 403.
  const courses = useApi(() => coursesApi.list(facultyId ? { facultyId } : {}), [facultyId])

  useEffect(() => {
    if (!courseId && courses.data?.length) setCourseId(courses.data[0].id)
  }, [courses.data, courseId])

  const sessions = useApi(() => (courseId ? attendanceApi.sessions(courseId) : Promise.resolve([])), [courseId])
  const roster = useApi(() => (courseId ? coursesApi.students(courseId) : Promise.resolve([])), [courseId])
  const summary = useApi(
    () => (courseId ? attendanceApi.courseSummary(courseId) : Promise.resolve([])),
    [courseId, saved],
  )

  // Default to the most recent session (the API returns them newest-first).
  useEffect(() => {
    setMarks({})
    setSessionId(sessions.data?.[0]?.id ?? '')
  }, [sessions.data])

  const selectedCourse = courses.data?.find((c) => c.id === courseId)
  const students = roster.data ?? []
  const markedCount = Object.keys(marks).length
  const presentCount = Object.values(marks).filter((v) => v === 'PRESENT').length
  const allMarked = students.length > 0 && markedCount === students.length

  function handleMark(studentId: string, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: status }))
    setSaved(false)
    setSaveError(null)
  }

  function markAll(status: AttendanceStatus) {
    setMarks(Object.fromEntries(students.map((s) => [s.id, status])))
    setSaved(false)
  }

  async function handleSave() {
    if (!sessionId) return
    setSaving(true)
    setSaveError(null)
    try {
      await attendanceApi.mark(
        sessionId,
        Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      )
      setSaved(true)
      sessions.refetch()
    } catch (err) {
      setSaveError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleNewSession() {
    if (!courseId) return
    setSaveError(null)
    try {
      const session = await attendanceApi.createSession({ courseId, date: new Date().toISOString() })
      setMarks({})
      sessions.refetch()
      setSessionId(session.id)
    } catch (err) {
      // A session already exists for this course+date (unique constraint).
      setSaveError(apiErrorMessage(err))
    }
  }

  async function handleExport() {
    if (!courseId) return
    setExporting(true)
    try {
      await reportsApi.courseAttendance(courseId, selectedCourse?.code)
    } catch (err) {
      setSaveError(apiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const summaryRows = summary.data ?? []
  const withPct = summaryRows.filter((r) => r.percentage !== null)
  const courseAvg = withPct.length
    ? Math.round((withPct.reduce((a, r) => a + (r.percentage ?? 0), 0) / withPct.length) * 10) / 10
    : null
  const belowThreshold = withPct.filter((r) => (r.percentage ?? 0) < THRESHOLD).length

  // Newest sessions first from the API; reverse for a left-to-right time axis.
  const recentSessions = useMemo(() => (sessions.data ?? []).slice(0, 8).reverse(), [sessions.data])

  return (
    <>
      <SectionHeading
        eyebrow="Daily register"
        title="Attendance"
        icon={<CalendarCheck className="h-5 w-5" />}
        subtitle="Mark a session's register or review course-wide records and eligibility flags."
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!courseId || exporting}>
            <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        }
      />

      {courses.loading && <LoadingPanel label="Loading your courses…" />}
      {courses.error && <ErrorState message={courses.error} onRetry={courses.refetch} />}

      {!courses.loading && !courses.error && (courses.data ?? []).length === 0 && (
        <div className="panel panel-raised">
          <EmptyState message="No courses assigned to you." hint="An administrator assigns courses to faculty accounts." />
        </div>
      )}

      {!courses.loading && (courses.data ?? []).length > 0 && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatTile
              index={0}
              label="Marked This Session"
              value={`${presentCount}/${students.length}`}
              accent="green"
              sub={allMarked ? 'Register complete' : `${markedCount} of ${students.length} marked`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              meter={students.length ? (presentCount / students.length) * 100 : 0}
            />
            <StatTile
              index={1}
              label="Course Average"
              value={courseAvg === null ? '—' : `${courseAvg}%`}
              numeric={courseAvg ?? undefined}
              suffix="%"
              accent={courseAvg !== null && courseAvg >= THRESHOLD ? 'green' : 'amber'}
              sub={`${sessions.data?.length ?? 0} sessions recorded`}
              icon={<CalendarCheck className="h-5 w-5" />}
              meter={courseAvg ?? 0}
            />
            <StatTile
              index={2}
              label="Below Threshold"
              value={belowThreshold}
              numeric={belowThreshold}
              accent="red"
              sub={`Students under ${THRESHOLD}%`}
              icon={<XCircle className="h-5 w-5" />}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {(courses.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-64">
              <Select
                label="Session"
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value)
                  setMarks({})
                }}
                disabled={(sessions.data ?? []).length === 0}
              >
                {(sessions.data ?? []).length === 0 && <option value="">No sessions yet</option>}
                {(sessions.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.date)} · {s._count?.records ?? 0} marked
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" size="sm" className="mb-0.5" onClick={handleNewSession}>
              New session for today
            </Button>
          </div>

          {saveError && (
            <div className="mb-4 rounded-xl border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--risk-high))]/8 px-4 py-3 text-xs text-[hsl(var(--risk-high))]">
              {saveError}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {/* ── Mark attendance ── */}
            <ScrollDepth index={0}>
              <Card tilt={false} elevation={3} className="h-full">
                <CardHeader>
                  <div>
                    <CardTitle>Mark Attendance</CardTitle>
                    <CardSubtitle>
                      {sessionId
                        ? formatDate(sessions.data?.find((s) => s.id === sessionId)?.date)
                        : 'Create a session to begin'}
                    </CardSubtitle>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => markAll('PRESENT')}
                      disabled={!sessionId || students.length === 0}
                      className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      All P
                    </button>
                    <button
                      onClick={() => markAll('ABSENT')}
                      disabled={!sessionId || students.length === 0}
                      className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      All A
                    </button>
                  </div>
                </CardHeader>

                {roster.loading && <LoadingPanel label="Loading roster…" />}
                {!roster.loading && students.length === 0 && (
                  <EmptyState message="No students enrolled in this course." />
                )}

                {!roster.loading && students.length > 0 && (
                  <>
                    <div
                      className="max-h-[420px] space-y-2 overflow-y-auto pr-1"
                      style={{ perspective: depth ? '1000px' : undefined }}
                    >
                      {students.map((s, i) => {
                        const status = marks[s.id]
                        const accent = status === 'PRESENT' ? GREEN : status === 'ABSENT' ? RED : undefined
                        return (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, x: -14 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-300"
                            style={{
                              borderColor: accent
                                ? `color-mix(in oklab, ${accent} 35%, transparent)`
                                : 'hsl(var(--border) / 0.7)',
                              background: accent
                                ? `color-mix(in oklab, ${accent} 9%, transparent)`
                                : 'hsl(var(--surface-sunken) / 0.4)',
                              boxShadow: accent
                                ? `0 0 22px -12px ${accent}, inset 0 1px 0 rgb(255 255 255 / 0.05)`
                                : 'inset 0 1px 2px rgb(0 0 0 / 0.3)',
                              transform: depth && accent ? 'translateZ(14px)' : undefined,
                            }}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">{fullName(s)}</div>
                              <div className="text-[11px] text-muted-foreground">{s.rollNumber}</div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <MarkButton
                                active={status === 'PRESENT'}
                                color={GREEN}
                                disabled={!sessionId}
                                onClick={() => handleMark(s.id, 'PRESENT')}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> P
                              </MarkButton>
                              <MarkButton
                                active={status === 'ABSENT'}
                                color={RED}
                                disabled={!sessionId}
                                onClick={() => handleMark(s.id, 'ABSENT')}
                              >
                                <XCircle className="h-3.5 w-3.5" /> A
                              </MarkButton>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      {saved && (
                        <motion.span
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1.5 text-sm font-semibold"
                          style={{ color: GREEN }}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Saved to the database
                        </motion.span>
                      )}
                      <Button className="ml-auto" disabled={markedCount === 0 || saving || !sessionId} onClick={handleSave}>
                        {saving ? 'Saving…' : `Save ${markedCount || ''} ${markedCount === 1 ? 'entry' : 'entries'}`}
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </ScrollDepth>

            {/* ── Summary ── */}
            <ScrollDepth index={1}>
              <Card tilt={false} elevation={3} className="h-full">
                <CardHeader>
                  <div>
                    <CardTitle>Student-wise Summary</CardTitle>
                    <CardSubtitle>
                      {selectedCourse?.code} · threshold {THRESHOLD}%
                    </CardSubtitle>
                  </div>
                </CardHeader>

                {summary.loading && <LoadingPanel label="Computing summary…" />}
                {!summary.loading && summaryRows.length === 0 && <EmptyState message="No attendance recorded yet." />}

                {!summary.loading && summaryRows.length > 0 && (
                  <div className="max-h-[420px] space-y-3.5 overflow-y-auto pr-1">
                    {summaryRows.map((r) => {
                      const color = attendanceColor(r.percentage, THRESHOLD)
                      return (
                        <div key={r.student.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium">{fullName(r.student)}</span>
                            <span className="shrink-0 font-display font-bold tabular-nums" style={{ color }}>
                              {r.percentage === null ? '—' : `${r.percentage}%`}
                              {r.percentage !== null && r.percentage < THRESHOLD && ' ⚠'}
                            </span>
                          </div>
                          <MeterBar value={r.percentage ?? 0} color={color} />
                          <div className="text-[10px] text-muted-foreground">
                            {r.present}/{r.total} classes attended
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </ScrollDepth>
          </div>

          {recentSessions.length > 0 && (
            <div className="mt-5">
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Recent Sessions
              </h4>
              <ScrollDepth>
                <Card tilt={false} elevation={3}>
                  <Bar3D
                    height={140}
                    depthPx={12}
                    data={recentSessions.map((s) => ({
                      label: new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                      value: s._count?.records ?? 0,
                      color: (s._count?.records ?? 0) > 0 ? GREEN : 'hsl(var(--muted-foreground))',
                    }))}
                  />
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">Records marked per session</p>
                </Card>
              </ScrollDepth>
            </div>
          )}
        </>
      )}
    </>
  )
}

/* ═══════════════════ Student ═══════════════════ */
function StudentAttendanceView({ studentId }: { studentId: string }) {
  const attendance = useApi(() => attendanceApi.forStudent(studentId), [studentId])

  if (attendance.loading) return <LoadingPanel label="Loading your attendance…" />
  if (attendance.error) return <ErrorState message={attendance.error} onRetry={attendance.refetch} />

  const data = attendance.data
  if (!data || data.total === 0) {
    return (
      <div className="panel panel-raised">
        <EmptyState message="No attendance recorded yet." />
      </div>
    )
  }

  // Roll the flat record list up per course for the summary panel.
  const byCourse = new Map<string, { code: string; name: string; total: number; present: number }>()
  for (const r of data.records) {
    const course = r.session?.course
    if (!course) continue
    const acc = byCourse.get(course.id) ?? { code: course.code, name: course.name, total: 0, present: 0 }
    acc.total += 1
    if (r.status === 'PRESENT' || r.status === 'LATE') acc.present += 1
    byCourse.set(course.id, acc)
  }
  const courses = [...byCourse.values()].map((c) => ({
    ...c,
    percentage: Math.round((c.present / c.total) * 1000) / 10,
  }))

  const overallColor = attendanceColor(data.percentage, THRESHOLD)

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile
          index={0}
          label="Overall Attendance"
          value={data.percentage === null ? '—' : `${data.percentage}%`}
          numeric={data.percentage ?? undefined}
          suffix="%"
          accent={data.percentage !== null && data.percentage >= THRESHOLD ? 'green' : 'red'}
          sub={`${data.present} of ${data.total} classes`}
          meter={data.percentage ?? 0}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatTile
          index={1}
          label="Exam Eligibility"
          value={data.percentage !== null && data.percentage >= THRESHOLD ? 'ELIGIBLE' : 'AT RISK'}
          accent={data.percentage !== null && data.percentage >= THRESHOLD ? 'green' : 'red'}
          sub={`Requirement ${THRESHOLD}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatTile
          index={2}
          label="Courses Below Threshold"
          value={courses.filter((c) => c.percentage < THRESHOLD).length}
          numeric={courses.filter((c) => c.percentage < THRESHOLD).length}
          accent="amber"
          sub={`Of ${courses.length} enrolled`}
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <div className="mb-5">
        <ScrollDepth>
          <Card tilt={false} elevation={3}>
            <CardHeader>
              <div>
                <CardTitle>Attendance by Course</CardTitle>
                <CardSubtitle>Threshold {THRESHOLD}%</CardSubtitle>
              </div>
              <span className="font-display text-sm font-bold tabular-nums" style={{ color: overallColor }}>
                {data.percentage}% overall
              </span>
            </CardHeader>
            <div className="space-y-3.5">
              {courses.map((c) => {
                const color = attendanceColor(c.percentage, THRESHOLD)
                return (
                  <div key={c.code} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">
                        {c.code} · {c.name}
                      </span>
                      <span className="shrink-0 font-display font-bold tabular-nums" style={{ color }}>
                        {c.percentage}%
                      </span>
                    </div>
                    <MeterBar value={c.percentage} color={color} />
                    <div className="text-[10px] text-muted-foreground">
                      {c.present}/{c.total} classes attended
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </ScrollDepth>
      </div>

      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent Classes</h4>
      <ScrollDepth>
        <Table>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Course</Th>
              <Th>Topic</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.records.slice(0, 25).map((r, i) => {
              const present = r.status === 'PRESENT' || r.status === 'LATE'
              return (
                <Tr key={r.id} index={i}>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(r.session?.date)}</Td>
                  <Td className="text-sm font-medium">{r.session?.course?.code ?? '—'}</Td>
                  <Td className="text-[11px] text-muted-foreground">{r.session?.topic ?? '—'}</Td>
                  <Td>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        color: present ? GREEN : RED,
                        background: `color-mix(in oklab, ${present ? GREEN : RED} 14%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${present ? GREEN : RED} 32%, transparent)`,
                      }}
                    >
                      {r.status}
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </ScrollDepth>
    </>
  )
}

export function AttendancePage() {
  const { user } = useAuth()

  if (user?.role === 'STUDENT') {
    return (
      <div>
        <SectionHeading
          eyebrow="My record"
          title="Attendance"
          icon={<CalendarCheck className="h-5 w-5" />}
          subtitle="Your class-by-class record and exam-eligibility standing."
        />
        {user.studentId ? <StudentAttendanceView studentId={user.studentId} /> : <TableSkeleton />}
      </div>
    )
  }

  return (
    <div>
      <RegisterView facultyId={user?.role === 'FACULTY' ? user.facultyId : undefined} />
    </div>
  )
}

/** Present/Absent key — lights up and presses in when selected. */
function MarkButton({
  active, color, onClick, children, disabled,
}: {
  active: boolean; color: string; onClick: () => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-40',
        !active && 'border border-border text-muted-foreground hover:text-foreground',
      )}
      style={
        active
          ? {
              background: color,
              color: 'hsl(230 30% 8%)',
              boxShadow: `0 0 20px -6px ${color}, inset 0 1px 0 rgb(255 255 255 / 0.35), 0 2px 6px rgb(0 0 0 / 0.4)`,
            }
          : undefined
      }
    >
      {children}
    </button>
  )
}

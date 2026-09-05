import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Download, Search, TrendingUp, Trophy } from 'lucide-react'
import { SectionHeading, StatTile, EmptyState, ErrorState, LoadingPanel, TableSkeleton } from '@/components/ui/Shared'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { Bar3D, MeterBar } from '@/components/three-d/Charts3D'
import { useAuth } from '@/store/auth-context'
import { useApi } from '@/hooks/useApi'
import { coursesApi, examsApi, reportsApi } from '@/lib/endpoints'
import { apiErrorMessage } from '@/lib/api'
import { cn, formatDate, fullName, toNumber } from '@/lib/utils'

/** Matches the server's grade bands in server/src/utils/grade.ts. */
const GRADE_COLOR: Record<string, string> = {
  A: 'hsl(152 70% 50%)',
  B: 'hsl(190 88% 52%)',
  C: 'hsl(200 82% 55%)',
  D: 'hsl(45 92% 58%)',
  E: 'hsl(24 95% 55%)',
  F: 'hsl(0 84% 60%)',
}

const PODIUM = ['hsl(45 92% 58%)', 'hsl(220 12% 70%)', 'hsl(28 70% 52%)']

function scoreColor(pct: number): string {
  if (pct < 40) return 'hsl(var(--risk-high))'
  if (pct >= 75) return 'hsl(var(--risk-low))'
  return 'hsl(var(--risk-medium))'
}

/* ═══════════════════ Admin / Faculty ═══════════════════ */
function MarksView({ facultyId }: { facultyId?: string }) {
  const [courseId, setCourseId] = useState('')
  const [examId, setExamId] = useState('')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const courses = useApi(() => coursesApi.list(facultyId ? { facultyId } : {}), [facultyId])

  useEffect(() => {
    if (!courseId && courses.data?.length) setCourseId(courses.data[0].id)
  }, [courses.data, courseId])

  const exams = useApi(() => (courseId ? examsApi.list(courseId) : Promise.resolve([])), [courseId])

  useEffect(() => {
    setExamId(exams.data?.[0]?.id ?? '')
  }, [exams.data])

  const marks = useApi(() => (examId ? examsApi.marks(examId) : Promise.resolve([])), [examId])

  const selectedCourse = courses.data?.find((c) => c.id === courseId)
  const selectedExam = exams.data?.find((e) => e.id === examId)
  const maxMarks = toNumber(selectedExam?.maxMarks)

  const rows = marks.data ?? []
  const filtered = rows.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.student.firstName.toLowerCase().includes(q) ||
      r.student.lastName.toLowerCase().includes(q) ||
      r.student.rollNumber.toLowerCase().includes(q)
    )
  })

  const scores = rows.map((r) => toNumber(r.marksObtained))
  const avgPct = scores.length && maxMarks > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / maxMarks) * 1000) / 10
    : null
  const passCount = maxMarks > 0 ? scores.filter((s) => (s / maxMarks) * 100 >= 40).length : 0
  const passRate = scores.length ? Math.round((passCount / scores.length) * 100) : null
  const topScore = scores.length ? Math.max(...scores) : null

  const gradeDist = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (!r.grade) continue
      counts.set(r.grade, (counts.get(r.grade) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([grade, count]) => ({ grade, count }))
  }, [rows])

  const topPerformers = useMemo(
    () => [...rows].sort((a, b) => toNumber(b.marksObtained) - toNumber(a.marksObtained)).slice(0, 5),
    [rows],
  )

  async function handleExport() {
    if (!examId) return
    setExporting(true)
    setError(null)
    try {
      await reportsApi.examResultSheet(examId, selectedCourse?.code)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <SectionHeading
        eyebrow="Academics"
        title="Exam Results"
        icon={<BarChart3 className="h-5 w-5" />}
        subtitle="Grade distribution, toppers and per-student marks for each exam."
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!examId || exporting}>
            <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Result Sheet (PDF)'}
          </Button>
        }
      />

      {courses.loading && <LoadingPanel label="Loading courses…" />}
      {courses.error && <ErrorState message={courses.error} onRetry={courses.refetch} />}

      {!courses.loading && (courses.data ?? []).length === 0 && (
        <div className="panel panel-raised">
          <EmptyState message="No courses assigned to you." />
        </div>
      )}

      {!courses.loading && (courses.data ?? []).length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {(courses.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-72">
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
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--risk-high))]/8 px-4 py-3 text-xs text-[hsl(var(--risk-high))]">
              {error}
            </div>
          )}

          {!examId && !exams.loading && (
            <div className="panel panel-raised">
              <EmptyState message="No exams scheduled for this course yet." />
            </div>
          )}

          {examId && (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <StatTile
                  index={0}
                  label="Average Score"
                  value={avgPct === null ? '—' : `${avgPct}%`}
                  numeric={avgPct ?? undefined}
                  suffix="%"
                  accent="amber"
                  sub={`Out of ${maxMarks} marks`}
                  icon={<BarChart3 className="h-5 w-5" />}
                  meter={avgPct ?? 0}
                />
                <StatTile
                  index={1}
                  label="Pass Rate"
                  value={passRate === null ? '—' : `${passRate}%`}
                  numeric={passRate ?? undefined}
                  suffix="%"
                  accent="green"
                  sub={`${passCount} of ${scores.length} students`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  meter={passRate ?? 0}
                />
                <StatTile
                  index={2}
                  label="Top Score"
                  value={topScore === null ? '—' : `${topScore}/${maxMarks}`}
                  accent="green"
                  sub={topPerformers[0] ? fullName(topPerformers[0].student) : 'No marks entered'}
                  icon={<Trophy className="h-5 w-5" />}
                  meter={topScore !== null && maxMarks > 0 ? (topScore / maxMarks) * 100 : 0}
                />
              </div>

              <div className="mb-5 grid gap-4 lg:grid-cols-2">
                <ScrollDepth index={0}>
                  <Card tilt={false} elevation={3} className="h-full">
                    <CardHeader>
                      <div>
                        <CardTitle>Grade Distribution</CardTitle>
                        <CardSubtitle>{rows.length} results in this exam</CardSubtitle>
                      </div>
                    </CardHeader>
                    {gradeDist.length === 0 ? (
                      <EmptyState message="No marks entered for this exam." />
                    ) : (
                      <Bar3D
                        height={200}
                        depthPx={14}
                        data={gradeDist.map((g) => ({
                          label: g.grade,
                          value: g.count,
                          color: GRADE_COLOR[g.grade] ?? 'hsl(var(--primary))',
                        }))}
                      />
                    )}
                  </Card>
                </ScrollDepth>

                <ScrollDepth index={1}>
                  <Card tilt={false} elevation={3} className="h-full">
                    <CardHeader>
                      <div>
                        <CardTitle>Top Performers</CardTitle>
                        <CardSubtitle>Highest scores in this exam</CardSubtitle>
                      </div>
                    </CardHeader>
                    {topPerformers.length === 0 ? (
                      <EmptyState message="No marks entered yet." />
                    ) : (
                      <div className="space-y-2">
                        {topPerformers.map((r, i) => {
                          const medal = i < 3 ? PODIUM[i] : undefined
                          const obtained = toNumber(r.marksObtained)
                          return (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, x: -16 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-sunken/40 px-4 py-2.5 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)] transition-colors hover:border-primary/35"
                            >
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold"
                                style={
                                  medal
                                    ? {
                                        color: medal,
                                        background: `color-mix(in oklab, ${medal} 15%, transparent)`,
                                        boxShadow: `0 0 14px -6px ${medal}`,
                                      }
                                    : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted) / 0.5)' }
                                }
                              >
                                {i + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold">{fullName(r.student)}</div>
                                <div className="truncate text-[11px] text-muted-foreground">{r.student.rollNumber}</div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className="font-display text-sm font-bold tabular-nums"
                                  style={{ color: GRADE_COLOR[r.grade ?? ''] ?? 'hsl(var(--foreground))' }}
                                >
                                  {obtained}/{maxMarks}
                                </span>
                                {r.grade && <Badge variant="outline">{r.grade}</Badge>}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </ScrollDepth>
              </div>

              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search name or roll no…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    icon={<Search className="h-4 w-4" />}
                  />
                </div>
                <span className="ml-auto mb-2.5 text-xs text-muted-foreground">
                  <span className="font-display font-bold text-foreground">{filtered.length}</span> records
                </span>
              </div>

              {marks.loading && <TableSkeleton rows={8} cols={5} />}
              {marks.error && <ErrorState message={marks.error} onRetry={marks.refetch} />}

              {!marks.loading && !marks.error && (
                <ScrollDepth>
                  {filtered.length === 0 ? (
                    <div className="panel panel-raised">
                      <EmptyState message="No results match that search." />
                    </div>
                  ) : (
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Student</Th>
                          <Th>Marks</Th>
                          <Th>Score</Th>
                          <Th>Grade</Th>
                          <Th>Remarks</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filtered.map((r, i) => {
                          const obtained = toNumber(r.marksObtained)
                          const pctScore = maxMarks > 0 ? Math.round((obtained / maxMarks) * 100) : 0
                          const color = scoreColor(pctScore)
                          const gradeHue = GRADE_COLOR[r.grade ?? ''] ?? 'hsl(var(--muted-foreground))'
                          return (
                            <Tr key={r.id} index={i}>
                              <Td>
                                <div className="text-sm font-semibold">{fullName(r.student)}</div>
                                <div className="text-[11px] text-muted-foreground">{r.student.rollNumber}</div>
                              </Td>
                              <Td className="whitespace-nowrap font-display font-bold tabular-nums">
                                {obtained}
                                <span className="text-muted-foreground">/{maxMarks}</span>
                              </Td>
                              <Td>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-20">
                                    <MeterBar value={pctScore} color={color} />
                                  </div>
                                  <span className={cn('text-xs font-bold tabular-nums')} style={{ color }}>
                                    {pctScore}%
                                  </span>
                                </div>
                              </Td>
                              <Td>
                                <span
                                  className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-lg px-2 font-display text-xs font-bold"
                                  style={{
                                    color: gradeHue,
                                    background: `color-mix(in oklab, ${gradeHue} 13%, transparent)`,
                                    border: `1px solid color-mix(in oklab, ${gradeHue} 30%, transparent)`,
                                    boxShadow: `0 0 14px -7px ${gradeHue}`,
                                  }}
                                >
                                  {r.grade ?? '—'}
                                </span>
                              </Td>
                              <Td className="text-[11px] text-muted-foreground">{r.remarks ?? '—'}</Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  )}
                </ScrollDepth>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

/* ═══════════════════ Student ═══════════════════ */
function StudentResults({ studentId, rollNumber }: { studentId: string; rollNumber?: string }) {
  const results = useApi(() => examsApi.studentResults(studentId), [studentId])
  const [exporting, setExporting] = useState(false)

  if (results.loading) return <LoadingPanel label="Loading your results…" />
  if (results.error) return <ErrorState message={results.error} onRetry={results.refetch} />

  const rows = results.data ?? []
  if (rows.length === 0) {
    return (
      <div className="panel panel-raised">
        <EmptyState message="No results published yet." />
      </div>
    )
  }

  const percentages = rows.map((r) => (toNumber(r.marksObtained) / toNumber(r.exam?.maxMarks)) * 100)
  const avg = Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
  const passed = percentages.filter((p) => p >= 40).length
  const best = Math.max(...percentages)

  // Average percentage per course, for the progression chart.
  const byCourse = new Map<string, { code: string; sum: number; count: number }>()
  for (const r of rows) {
    const course = r.exam?.course
    if (!course) continue
    const acc = byCourse.get(course.id) ?? { code: course.code, sum: 0, count: 0 }
    acc.sum += (toNumber(r.marksObtained) / toNumber(r.exam?.maxMarks)) * 100
    acc.count += 1
    byCourse.set(course.id, acc)
  }

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile index={0} label="Average Score" value={`${avg}%`} numeric={avg} suffix="%" accent={avg >= 60 ? 'green' : avg >= 40 ? 'amber' : 'red'} sub={`Across ${rows.length} exams`} icon={<BarChart3 className="h-5 w-5" />} meter={avg} />
        <StatTile index={1} label="Exams Passed" value={`${passed}/${rows.length}`} accent={passed === rows.length ? 'green' : 'amber'} sub="Pass mark 40%" icon={<TrendingUp className="h-5 w-5" />} meter={(passed / rows.length) * 100} />
        <StatTile index={2} label="Best Result" value={`${Math.round(best)}%`} numeric={Math.round(best)} suffix="%" accent="green" sub="Highest single exam" icon={<Trophy className="h-5 w-5" />} meter={best} />
      </div>

      <div className="mb-5">
        <ScrollDepth>
          <Card tilt={false} elevation={3}>
            <CardHeader>
              <div>
                <CardTitle>Average Score by Course</CardTitle>
                <CardSubtitle>Across every exam in each course</CardSubtitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true)
                  try {
                    await reportsApi.studentReportCard(studentId, rollNumber)
                  } finally {
                    setExporting(false)
                  }
                }}
              >
                <Download className="h-4 w-4" /> {exporting ? 'Preparing…' : 'Report Card'}
              </Button>
            </CardHeader>
            <Bar3D
              height={180}
              format={(v) => `${v}%`}
              data={[...byCourse.values()].map((c) => {
                const value = Math.round((c.sum / c.count) * 10) / 10
                return { label: c.code, value, color: scoreColor(value) }
              })}
            />
          </Card>
        </ScrollDepth>
      </div>

      <ScrollDepth>
        <Table>
          <Thead>
            <Tr>
              <Th>Exam</Th>
              <Th>Course</Th>
              <Th>Date</Th>
              <Th>Marks</Th>
              <Th>Score</Th>
              <Th>Grade</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r, i) => {
              const obtained = toNumber(r.marksObtained)
              const max = toNumber(r.exam?.maxMarks)
              const pctScore = max > 0 ? Math.round((obtained / max) * 100) : 0
              const color = scoreColor(pctScore)
              const gradeHue = GRADE_COLOR[r.grade ?? ''] ?? 'hsl(var(--muted-foreground))'
              return (
                <Tr key={r.id} index={i}>
                  <Td className="text-sm font-semibold">{r.exam?.title ?? '—'}</Td>
                  <Td className="text-sm">
                    <span className="font-medium">{r.exam?.course?.code}</span>
                    <span className="text-muted-foreground"> · {r.exam?.course?.name}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDate(r.exam?.examDate)}</Td>
                  <Td className="whitespace-nowrap font-display font-bold tabular-nums">
                    {obtained}
                    <span className="text-muted-foreground">/{max}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-20">
                        <MeterBar value={pctScore} color={color} />
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color }}>
                        {pctScore}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span
                      className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-lg px-2 font-display text-xs font-bold"
                      style={{
                        color: gradeHue,
                        background: `color-mix(in oklab, ${gradeHue} 13%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${gradeHue} 30%, transparent)`,
                      }}
                    >
                      {r.grade ?? '—'}
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

export function ResultsPage() {
  const { user } = useAuth()

  if (user?.role === 'STUDENT') {
    return (
      <div>
        <SectionHeading
          eyebrow="Academics"
          title="My Results"
          icon={<BarChart3 className="h-5 w-5" />}
          subtitle="Every exam result on your record, newest first."
        />
        {user.studentId ? <StudentResults studentId={user.studentId} /> : <TableSkeleton />}
      </div>
    )
  }

  return (
    <div>
      <MarksView facultyId={user?.role === 'FACULTY' ? user.facultyId : undefined} />
    </div>
  )
}

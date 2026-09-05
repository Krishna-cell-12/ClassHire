import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Search, Users } from 'lucide-react'
import { SectionHeading, StatTile, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { MeterBar } from '@/components/three-d/Charts3D'
import { useApi, useDebounced } from '@/hooks/useApi'
import { departmentsApi, reportsApi, studentsApi } from '@/lib/endpoints'
import { apiErrorMessage } from '@/lib/api'
import { attendanceColor, cn, deptColor, FEE_BADGE, formatCurrency, fullName } from '@/lib/utils'

const PAGE_SIZE = 20
const ATTENDANCE_THRESHOLD = 75

export function StudentsPage() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [semFilter, setSemFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Search hits the API, so wait for a pause in typing rather than firing per keystroke.
  const debouncedSearch = useDebounced(search)

  const departments = useApi(() => departmentsApi.list(), [])

  const students = useApi(
    () =>
      studentsApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        departmentId: deptFilter === 'ALL' ? undefined : deptFilter,
        semester: semFilter === 'ALL' ? undefined : Number(semFilter),
      }),
    [page, debouncedSearch, deptFilter, semFilter],
  )

  // Any filter change invalidates the current page number.
  function updateFilter(fn: () => void) {
    fn()
    setPage(1)
  }

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await reportsApi.studentDirectory()
    } catch (err) {
      setExportError(apiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const rows = students.data?.data ?? []
  const meta = students.data?.meta
  const deptIndex = new Map((departments.data ?? []).map((d, i) => [d.id, i]))

  // Page-scoped, and labelled as such — the API paginates, so these describe the
  // rows on screen rather than the whole cohort.
  const withAttendance = rows.filter((s) => s.attendancePct !== null)
  const avgAttendance = withAttendance.length
    ? Math.round(withAttendance.reduce((a, s) => a + (s.attendancePct ?? 0), 0) / withAttendance.length)
    : null
  const belowThreshold = withAttendance.filter((s) => (s.attendancePct ?? 0) < ATTENDANCE_THRESHOLD).length

  return (
    <div>
      <SectionHeading
        eyebrow="Directory"
        title="Students"
        icon={<Users className="h-5 w-5" />}
        subtitle={
          meta
            ? `${meta.total} students across ${departments.data?.length ?? 0} departments`
            : 'Loading the student directory…'
        }
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        }
      />

      {exportError && (
        <div className="mb-4 rounded-xl border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--risk-high))]/8 px-4 py-3 text-xs text-[hsl(var(--risk-high))]">
          Export failed: {exportError}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          index={0}
          label="Total Enrolled"
          value={meta?.total ?? '—'}
          numeric={meta?.total}
          sub="Matching current filters"
          accent="orange"
          icon={<Users className="h-5 w-5" />}
        />
        <StatTile
          index={1}
          label="Departments"
          value={departments.data?.length ?? '—'}
          numeric={departments.data?.length}
          sub={(departments.data ?? []).map((d) => d.code).join(' · ') || 'Loading…'}
          accent="blue"
        />
        <StatTile
          index={2}
          label="Avg Attendance"
          value={avgAttendance === null ? '—' : `${avgAttendance}%`}
          numeric={avgAttendance ?? undefined}
          suffix="%"
          sub={`This page · threshold ${ATTENDANCE_THRESHOLD}%`}
          accent={avgAttendance !== null && avgAttendance >= ATTENDANCE_THRESHOLD ? 'green' : 'amber'}
          meter={avgAttendance ?? 0}
        />
        <StatTile
          index={3}
          label="Below Threshold"
          value={belowThreshold}
          numeric={belowThreshold}
          sub={`On this page of ${rows.length}`}
          accent="red"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name or roll number…"
            value={search}
            onChange={(e) => updateFilter(() => setSearch(e.target.value))}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-44">
          <Select value={deptFilter} onChange={(e) => updateFilter(() => setDeptFilter(e.target.value))}>
            <option value="ALL">All Departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Select value={semFilter} onChange={(e) => updateFilter(() => setSemFilter(e.target.value))}>
            <option value="ALL">All Sems</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </Select>
        </div>
        <span className="ml-auto mb-2.5 text-xs text-muted-foreground">
          <span className="font-display font-bold text-foreground">{meta?.total ?? 0}</span> results
        </span>
      </div>

      {students.loading && <TableSkeleton rows={8} cols={6} />}

      {students.error && !students.loading && (
        <div className="panel panel-raised">
          <ErrorState message={students.error} onRetry={students.refetch} />
        </div>
      )}

      {!students.loading && !students.error && (
        <ScrollDepth>
          {rows.length === 0 ? (
            <div className="panel panel-raised">
              <EmptyState message="No students match those filters." hint="Try clearing the search or widening the department." />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Student</Th>
                  <Th>Roll No</Th>
                  <Th>Dept / Sem</Th>
                  <Th>Batch</Th>
                  <Th>Attendance</Th>
                  <Th>Fees</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((s, i) => {
                  const color = deptColor(deptIndex.get(s.departmentId) ?? 0)
                  const attColor = attendanceColor(s.attendancePct, ATTENDANCE_THRESHOLD)
                  const name = fullName(s)
                  return (
                    <Tr key={s.id} index={i}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                            style={{
                              color,
                              background: `color-mix(in oklab, ${color} 14%, transparent)`,
                              boxShadow: `0 0 14px -7px ${color}`,
                            }}
                          >
                            {name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{s.user?.email ?? ''}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <code className="rounded-md border border-border/60 bg-surface-sunken/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {s.rollNumber}
                        </code>
                      </Td>
                      <Td className="whitespace-nowrap text-sm">
                        <span className="font-semibold" style={{ color }}>
                          {s.department.code}
                        </span>
                        <span className="text-muted-foreground"> · Sem {s.currentSemester}</span>
                      </Td>
                      <Td className="text-muted-foreground tabular-nums">{s.batchYear}</Td>
                      <Td>
                        {s.attendancePct === null ? (
                          <span className="text-xs text-muted-foreground">No records</span>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-16">
                              <MeterBar value={s.attendancePct} color={attColor} />
                            </div>
                            <span className={cn('font-display text-xs font-bold tabular-nums')} style={{ color: attColor }}>
                              {s.attendancePct}%
                            </span>
                          </div>
                        )}
                      </Td>
                      <Td>
                        {s.feeStatus === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant={FEE_BADGE[s.feeStatus] ?? 'default'}>{s.feeStatus}</Badge>
                            {s.feePending ? (
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {formatCurrency(s.feePending)}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <button
                          aria-label={`Download report card for ${name}`}
                          title="Download report card (PDF)"
                          onClick={() => reportsApi.studentReportCard(s.id, s.rollNumber).catch(() => {})}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          )}
        </ScrollDepth>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Page <span className="font-display font-bold text-foreground">{meta.page}</span> of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

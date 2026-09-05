import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Filter, ShieldAlert, TrendingDown, TrendingUp, X, FileText } from 'lucide-react'
import { SectionHeading, FactRow, ErrorState, TableSkeleton, EmptyState } from '@/components/ui/Shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Tilt3D, Layer } from '@/components/three-d/Tilt3D'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { Counter, MeterBar } from '@/components/three-d/Charts3D'
import { useDepth } from '@/store/ui-context'
import { useApi } from '@/hooks/useApi'
import { departmentsApi, reportsApi, riskApi } from '@/lib/endpoints'
import { attendanceColor, cn, formatCurrency, fullName, RISK_COLOR } from '@/lib/utils'
import type { RiskLevel, RiskRow } from '@/types'

const PAGE_SIZE = 20
const ATTENDANCE_THRESHOLD = 75

const bucketMeta: Record<RiskLevel, { label: string; desc: string }> = {
  HIGH: { label: 'High Risk', desc: 'Immediate intervention' },
  MEDIUM: { label: 'Medium Risk', desc: 'Monitor closely' },
  LOW: { label: 'Low Risk', desc: 'On track' },
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? RISK_COLOR.HIGH : score >= 40 ? RISK_COLOR.MEDIUM : RISK_COLOR.LOW
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-24">
        <MeterBar value={score} color={color} />
      </div>
      <span className="font-display text-xs font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

/**
 * Slide-over detail panel. It swings in on its own hinge (rotateY) rather than
 * simply translating, so it reads as a physical page turning out of the edge of
 * the screen.
 */
function DetailDrawer({ row, onClose }: { row: RiskRow; onClose: () => void }) {
  const depth = useDepth()
  const { student, risk } = row
  const color = RISK_COLOR[risk.level]
  const name = fullName(student)
  const attendance = risk.factors.attendance.percentage

  // Close on Escape, and stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Portalled to <body>: the page-transition wrapper keeps a transform, which
  // would otherwise become this drawer's containing block and break `fixed`.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <div className="relative h-full" style={{ perspective: depth ? '1600px' : undefined }}>
        <motion.aside
          initial={{ x: 60, opacity: 0, rotateY: depth ? -22 : 0 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          exit={{ x: 60, opacity: 0, rotateY: depth ? -18 : 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: '100% 50%' }}
          onClick={(e) => e.stopPropagation()}
          className="relative h-full w-screen max-w-md overflow-y-auto border-l border-border bg-surface/85 p-6 shadow-elev-4 backdrop-blur-2xl preserve-3d"
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold">{name}</h2>
              <p className="text-sm text-muted-foreground">
                {student.rollNumber} · {student.department.code} · Sem {student.currentSemester}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Score hero */}
          <div className="panel mb-6 flex items-center gap-5 p-5">
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: `color-mix(in oklab, ${color} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${color} 32%, transparent)`,
                boxShadow: `0 0 40px -14px ${color}, inset 0 1px 0 rgb(255 255 255 / 0.08)`,
              }}
            >
              <span className="font-display text-4xl font-bold tabular-nums" style={{ color }}>
                <Counter value={risk.score} />
              </span>
            </div>
            <div className="min-w-0 space-y-2">
              <Badge variant={risk.level.toLowerCase() as any} pulse={risk.level === 'HIGH'}>
                {bucketMeta[risk.level].label}
              </Badge>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Composite score: <span className="text-foreground">40%</span> attendance ·{' '}
                <span className="text-foreground">35%</span> fees · <span className="text-foreground">25%</span> grades
              </p>
            </div>
          </div>

          {/* Factors, with the sub-score the server actually assigned each one */}
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Factor Breakdown
          </h3>
          <div className="mb-6 space-y-3">
            <div className="rounded-xl border border-border/70 bg-surface-sunken/40 px-4 py-3 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)]">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Attendance <span className="text-[11px]">(sub-score {risk.factors.attendance.subScore})</span>
                </span>
                <span className="font-semibold" style={{ color: attendanceColor(attendance, ATTENDANCE_THRESHOLD) }}>
                  {attendance === null ? 'No records' : `${attendance}%`}
                </span>
              </div>
              <MeterBar value={attendance ?? 0} color={attendanceColor(attendance, ATTENDANCE_THRESHOLD)} />
              {attendance !== null && attendance < ATTENDANCE_THRESHOLD && (
                <p className="mt-2 text-[11px] text-[hsl(var(--risk-high))]">
                  ⚠ Below the {ATTENDANCE_THRESHOLD}% exam-eligibility threshold
                </p>
              )}
            </div>

            <FactRow
              label={`Fees (sub-score ${risk.factors.fees.subScore})`}
              tone={risk.factors.fees.daysOverdue > 0 ? 'bad' : 'good'}
            >
              {risk.factors.fees.status === null
                ? 'No slab'
                : risk.factors.fees.daysOverdue > 0
                  ? `${risk.factors.fees.status} · ${risk.factors.fees.daysOverdue}d`
                  : risk.factors.fees.status}
            </FactRow>

            {risk.factors.fees.pendingAmount > 0 && (
              <FactRow label="Outstanding" tone="warn">
                {formatCurrency(risk.factors.fees.pendingAmount)}
              </FactRow>
            )}

            <FactRow
              label={`Grade Trend (sub-score ${risk.factors.grades.subScore})`}
              tone={
                risk.factors.grades.trendPoints === null
                  ? 'neutral'
                  : risk.factors.grades.trendPoints < 0
                    ? 'bad'
                    : 'good'
              }
            >
              {risk.factors.grades.trendPoints === null ? (
                'Not enough exams'
              ) : (
                <span className="flex items-center gap-1">
                  {risk.factors.grades.trendPoints < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                  {risk.factors.grades.trendPoints > 0 ? '+' : ''}
                  {risk.factors.grades.trendPoints} pts
                </span>
              )}
            </FactRow>
          </div>

          {/* The server's own plain-language explanation */}
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Why This Score
          </h3>
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm',
              risk.level === 'LOW'
                ? 'border border-[hsl(var(--risk-low))]/28 bg-[hsl(var(--risk-low))]/8'
                : 'border border-[hsl(var(--risk-high))]/28 bg-[hsl(var(--risk-high))]/8',
            )}
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
            <span className="text-foreground/85">{risk.reason}</span>
          </div>

          <div className="mt-7">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => reportsApi.studentReportCard(student.id, student.rollNumber).catch(() => {})}
            >
              <FileText className="h-4 w-4" /> Download Report Card
            </Button>
          </div>
        </motion.aside>
      </div>
    </div>,
    document.body,
  )
}

export function RiskRadarPage() {
  const [level, setLevel] = useState<'ALL' | RiskLevel>('ALL')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RiskRow | null>(null)

  const departments = useApi(() => departmentsApi.list(), [])

  const risk = useApi(
    () =>
      riskApi.list({
        page,
        limit: PAGE_SIZE,
        level: level === 'ALL' ? undefined : level,
        departmentId: deptFilter === 'ALL' ? undefined : deptFilter,
      }),
    [page, level, deptFilter],
  )

  function updateFilter(fn: () => void) {
    fn()
    setPage(1)
  }

  const rows = risk.data?.data ?? []
  const meta = risk.data?.meta
  const counts = risk.data?.counts
  const cohortTotal = risk.data?.cohortTotal ?? 0

  return (
    <div>
      <SectionHeading
        eyebrow="Early warning system"
        title="Student Risk Radar"
        icon={<ShieldAlert className="h-5 w-5" />}
        subtitle="Composite score from attendance, fee delay and grade trend — computed server-side, no ML in the scoring path."
      />

      {/* Bucket selectors — pressable 3D slabs, counts from the whole cohort */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(['HIGH', 'MEDIUM', 'LOW'] as RiskLevel[]).map((bucket, i) => {
          const active = level === bucket
          const color = RISK_COLOR[bucket]
          const count = counts?.[bucket] ?? 0
          return (
            <ScrollDepth key={bucket} index={i}>
              <Tilt3D max={7} lift={active ? 34 : 22}>
                <button
                  onClick={() => updateFilter(() => setLevel(active ? 'ALL' : bucket))}
                  aria-pressed={active}
                  className={cn('panel w-full p-5 text-left transition-all duration-300', active && 'panel-raised')}
                  style={{
                    ['--accent' as any]: color,
                    ...(active
                      ? {
                          borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                          boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 30%, transparent), 0 22px 48px -18px ${color}, var(--elev-3)`,
                        }
                      : null),
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-[3px] rounded-b-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                      boxShadow: `0 0 16px ${color}`,
                    }}
                  />
                  <Layer z={20}>
                    <Badge variant={bucket.toLowerCase() as any} pulse={bucket === 'HIGH'} className="mb-3">
                      {bucketMeta[bucket].label}
                    </Badge>
                    <div className="font-display text-3xl font-bold tabular-nums" style={{ color }}>
                      <Counter value={count} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{bucketMeta[bucket].desc}</div>
                    <div className="mt-3">
                      <MeterBar value={count} max={Math.max(1, cohortTotal)} color={color} />
                    </div>
                  </Layer>
                </button>
              </Tilt3D>
            </ScrollDepth>
          )
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Filter className="mb-2.5 h-4 w-4 text-muted-foreground" />
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
        {level !== 'ALL' && (
          <Button variant="ghost" size="sm" onClick={() => updateFilter(() => setLevel('ALL'))}>
            Clear bucket filter
          </Button>
        )}
        <span className="ml-auto mb-2.5 text-xs text-muted-foreground">
          <span className="font-display font-bold text-foreground">{meta?.total ?? 0}</span> students
        </span>
      </div>

      {risk.loading && <TableSkeleton rows={8} cols={6} />}

      {risk.error && !risk.loading && (
        <div className="panel panel-raised">
          <ErrorState message={risk.error} onRetry={risk.refetch} />
        </div>
      )}

      {!risk.loading && !risk.error && (
        <ScrollDepth>
          {rows.length === 0 ? (
            <div className="panel panel-raised">
              <EmptyState message="No students in this bucket." hint="Try a different risk level or department." />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Student</Th>
                  <Th>Dept / Sem</Th>
                  <Th>Attendance</Th>
                  <Th>Risk Score</Th>
                  <Th>Level</Th>
                  <Th>Reason</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, i) => {
                  const { student, risk: r } = row
                  const color = RISK_COLOR[r.level]
                  const name = fullName(student)
                  const attendance = r.factors.attendance.percentage
                  return (
                    <Tr key={student.id} index={i} onClick={() => setSelected(row)}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                            style={{
                              color,
                              background: `color-mix(in oklab, ${color} 14%, transparent)`,
                              boxShadow: `0 0 14px -7px ${color}`,
                            }}
                          >
                            {name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{name}</div>
                            <div className="text-[11px] text-muted-foreground">{student.rollNumber}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-sm">
                        <span className="font-semibold">{student.department.code}</span>
                        <span className="text-muted-foreground"> · Sem {student.currentSemester}</span>
                      </Td>
                      <Td>
                        <span
                          className="font-display text-sm font-bold tabular-nums"
                          style={{ color: attendanceColor(attendance, ATTENDANCE_THRESHOLD) }}
                        >
                          {attendance === null ? '—' : `${attendance}%`}
                        </span>
                      </Td>
                      <Td>
                        <ScoreBar score={r.score} />
                      </Td>
                      <Td>
                        <Badge variant={r.level.toLowerCase() as any}>{r.level}</Badge>
                      </Td>
                      <Td>
                        <span className="line-clamp-2 max-w-xs text-[11px] text-muted-foreground">{r.reason}</span>
                      </Td>
                      <Td>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>{selected && <DetailDrawer row={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </div>
  )
}

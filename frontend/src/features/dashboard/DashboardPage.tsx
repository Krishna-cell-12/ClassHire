import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/store/auth-context'
import { useDepth } from '@/store/ui-context'
import { useApi } from '@/hooks/useApi'
import { dashboardApi } from '@/lib/endpoints'
import { cn, formatCurrency, formatPercent, deptColor } from '@/lib/utils'
import { ErrorState, LoadingPanel } from '@/components/ui/Shared'
import { Badge } from '@/components/ui/Badge'
import { Tilt3D, Layer } from '@/components/three-d/Tilt3D'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { Bar3D, Counter, Donut3D, MeterBar, Ring3D, Sparkline } from '@/components/three-d/Charts3D'
import type { AdminDashboard, FacultyDashboard, StudentDashboard } from '@/types'

/* ═══════════════════ tokens ═══════════════════ */
const C = {
  orange: 'hsl(var(--primary))',
  green: 'hsl(var(--risk-low))',
  amber: 'hsl(var(--risk-medium))',
  red: 'hsl(var(--risk-high))',
  cyan: 'hsl(var(--neon-cyan))',
  violet: 'hsl(var(--neon-violet))',
  muted: 'hsl(var(--muted-foreground))',
}

/** Shared rule for "is this attendance figure healthy", used by every tile below. */
function attendanceTone(pct: number | null, threshold: number): string {
  if (pct === null) return C.muted
  if (pct >= threshold + 5) return C.green
  if (pct >= threshold) return C.amber
  return C.red
}

/* ═══════════════════ status badge ═══════════════════ */
function StatusBadge({ status }: { status: 'Green' | 'Amber' | 'Alert' | 'None' }) {
  const color =
    status === 'Green' ? C.green : status === 'Amber' ? C.amber : status === 'Alert' ? C.red : C.muted
  const label = status === 'None' ? 'No data' : status
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        color,
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 34%, transparent)`,
        boxShadow: `0 0 12px -6px ${color}`,
      }}
    >
      {label}
    </span>
  )
}

/* ═══════════════════ KPI slab ═══════════════════ */
interface KpiCardProps {
  label: string
  value: string
  numeric?: number
  prefix?: string
  suffix?: string
  color?: string
  sub: string
  sub2?: string
  trend?: 'up' | 'down'
  icon?: React.ReactNode
  sparkData?: number[]
  badge?: string
  ring?: { pct: number; color: string }
  index?: number
}

/**
 * The core dashboard object: a glass slab whose value plane, chart plane and
 * chrome sit at three different Z depths, so the whole card parallaxes as it
 * tilts toward the cursor.
 */
function KpiCard({
  label, value, numeric, prefix, suffix, color = C.orange, sub, sub2, trend,
  icon, sparkData, badge, ring, index = 0,
}: KpiCardProps) {
  const depth = useDepth()

  return (
    <ScrollDepth index={index}>
      <Tilt3D max={7} lift={30} className="h-full">
        <div className="panel h-full p-5" style={{ ['--accent' as any]: color }}>
          {/* Leading edge light — fades to transparent at both ends so it sits
              inside the rounded corners without needing to be clipped. */}
          <span
            aria-hidden
            className="absolute inset-x-5 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          />

          <div className="flex h-full flex-col justify-between gap-4">
            <Layer z={26}>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[34px] font-bold leading-none tabular-nums" style={{ color }}>
                    {numeric !== undefined ? (
                      <Counter value={numeric} prefix={prefix} suffix={suffix} decimals={numeric % 1 !== 0 ? 1 : 0} />
                    ) : (
                      value
                    )}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    {trend === 'up' && <TrendingUp className="h-3 w-3" style={{ color: C.green }} />}
                    {trend === 'down' && <TrendingDown className="h-3 w-3" style={{ color: C.red }} />}
                    {sub}
                  </p>
                  {sub2 && <p className="text-xs text-muted-foreground">{sub2}</p>}
                </div>

                <div style={depth ? { transform: 'translateZ(16px)' } : undefined}>
                  {ring && <Ring3D pct={ring.pct} color={ring.color} size={70} />}
                  {icon && !ring && (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-surface-raised/60 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_8px_18px_-10px_rgb(0_0_0/0.9)]"
                      style={{ color }}
                    >
                      {icon}
                    </div>
                  )}
                </div>
              </div>
            </Layer>

            {(sparkData || badge) && (
              <Layer z={12} className="flex items-end justify-between gap-2">
                {sparkData && <Sparkline data={sparkData} color={color} height={30} width={86} />}
                {badge && (
                  <span className="ml-auto whitespace-nowrap rounded-lg border border-border/70 bg-surface-sunken/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                    {badge}
                  </span>
                )}
              </Layer>
            )}
          </div>
        </div>
      </Tilt3D>
    </ScrollDepth>
  )
}

/* ═══════════════════ subject card ═══════════════════ */
function SubjectCard({
  name, code, pct, meta, status, index,
}: {
  name: string; code: string; pct: number | null; meta: string
  status: 'Green' | 'Amber' | 'Alert' | 'None'; index: number
}) {
  const color =
    status === 'Green' ? C.green : status === 'Amber' ? C.amber : status === 'Alert' ? C.red : C.muted
  return (
    <ScrollDepth index={index} rotate={10} z={130}>
      <Tilt3D max={8} lift={24} className="h-full">
        <div className="panel h-full p-4">
          <Layer z={18}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{name}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{code}</div>
              </div>
              <span className="shrink-0 font-display text-sm font-bold tabular-nums" style={{ color }}>
                {pct === null ? '—' : `${pct}%`}
              </span>
            </div>
            <MeterBar value={pct ?? 0} color={color} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-muted-foreground">{meta}</span>
              <StatusBadge status={status} />
            </div>
          </Layer>
        </div>
      </Tilt3D>
    </ScrollDepth>
  )
}

/* ═══════════════════ panel wrapper ═══════════════════ */
function Panel({
  title, subtitle, action, children, index = 0, className, tilt = true,
}: {
  title: string; subtitle?: string; action?: React.ReactNode
  children: React.ReactNode; index?: number; className?: string; tilt?: boolean
}) {
  const inner = (
    <div className={cn('panel panel-raised h-full p-5', className)}>
      {/* z=0: this Panel's `action` slot carries real links ("View all →"),
          and nesting a second preserve-3d context here breaks their clicks
          in Chromium — see the note in Card.tsx for the full explanation. */}
      <Layer z={0} className="flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="flex-1">{children}</div>
      </Layer>
    </div>
  )
  return (
    <ScrollDepth index={index} className="h-full">
      {tilt ? <Tilt3D max={4} lift={16} className="h-full">{inner}</Tilt3D> : inner}
    </ScrollDepth>
  )
}

/* ═══════════════════ chart tooltip ═══════════════════ */
function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="panel px-3 py-2 text-xs shadow-elev-3">
      <div className="mb-1 font-display font-bold text-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.stroke ?? p.fill }} />
          <span className="uppercase text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-bold tabular-nums text-foreground">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

/** '2026-06' → 'Jun 26', for the trend chart's x-axis. */
function monthLabel(iso: string): string {
  const [year, month] = iso.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return `${date.toLocaleDateString('en-IN', { month: 'short' })} ${year.slice(2)}`
}

/* ═══════════════════ Admin ═══════════════════ */
function AdminView({ data }: { data: AdminDashboard }) {
  const { totals, attendance, fees, risk, topRisk, feeByDepartment, departmentCodes, gradeDistribution } = data

  const trend: Array<Record<string, string | number>> = data.attendanceTrend.map((point) => ({
    ...point,
    label: monthLabel(String(point.month)),
  }))

  // A genuine month-over-month series exists for attendance, so the KPI gets a
  // real sparkline; the other tiles have no history to plot and don't fake one.
  const attendanceSeries = trend
    .map((point) => {
      const values = departmentCodes.map((code) => Number(point[code])).filter((v) => !Number.isNaN(v))
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
    })
    .filter((v): v is number => v !== null)

  const riskDist = [
    { name: 'Low', value: risk.LOW, color: C.green },
    { name: 'Medium', value: risk.MEDIUM, color: C.amber },
    { name: 'High', value: risk.HIGH, color: C.red },
  ]

  const attColor = attendanceTone(attendance.average, attendance.threshold)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Total Students"
          value={String(totals.students)}
          numeric={totals.students}
          color={C.orange}
          sub={`${totals.departments} departments · ${totals.courses} courses`}
          icon={<Users className="h-6 w-6" />}
          badge={`${totals.faculty} faculty`}
        />
        <KpiCard
          index={1}
          label="Avg Attendance"
          value={formatPercent(attendance.average)}
          numeric={attendance.average ?? 0}
          suffix="%"
          color={attColor}
          sub={`${attendance.belowThreshold} below ${attendance.threshold}%`}
          ring={{ pct: attendance.average ?? 0, color: attColor }}
          sparkData={attendanceSeries.length > 1 ? attendanceSeries : undefined}
          badge="All departments"
        />
        <KpiCard
          index={2}
          label="Fee Collection"
          value={`${fees.collectionPct}%`}
          numeric={fees.collectionPct}
          suffix="%"
          color={fees.collectionPct >= 85 ? C.green : fees.collectionPct >= 70 ? C.amber : C.red}
          sub={`${formatCurrency(fees.collected)} of ${formatCurrency(fees.billed)}`}
          sub2={`${fees.defaulters} accounts outstanding`}
          icon={<Wallet className="h-6 w-6" />}
          badge={`${fees.overdue} overdue`}
        />
        <KpiCard
          index={3}
          label="High Risk"
          value={String(risk.HIGH)}
          numeric={risk.HIGH}
          color={C.red}
          sub={`${risk.MEDIUM} medium · ${risk.LOW} low`}
          icon={<ShieldAlert className="h-6 w-6" />}
          badge={`of ${risk.total} students`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          index={0}
          className="lg:col-span-2"
          title="Attendance Trend"
          subtitle="By department — from recorded sessions"
          action={
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {departmentCodes.map((code, i) => (
                <span key={code} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: deptColor(i), boxShadow: `0 0 8px ${deptColor(i)}` }}
                  />
                  {code}
                </span>
              ))}
            </div>
          }
        >
          {trend.length === 0 ? (
            <LoadingPanel label="No attendance sessions recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height={214}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDeptPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={deptColor(0)} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={deptColor(0)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.3 }} />
                {departmentCodes.map((code, i) => (
                  <Area
                    key={code}
                    type="monotone"
                    dataKey={code}
                    name={code}
                    stroke={deptColor(i)}
                    strokeWidth={i === 0 ? 2.5 : 2}
                    fill={i === 0 ? 'url(#gDeptPrimary)' : 'none'}
                    strokeDasharray={i > 2 ? '5 3' : undefined}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel index={1} title="Risk Distribution" subtitle={`${risk.total} students scored`}>
          <div className="flex flex-col items-center">
            <Donut3D data={riskDist} size={150} thickness={26} />
            <div className="mt-5 w-full space-y-2.5">
              {riskDist.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                    {d.name}
                  </span>
                  <span className="font-display font-bold tabular-nums text-foreground">
                    <Counter value={d.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          index={0}
          title="High Risk Students"
          subtitle="Ranked by composite score"
          action={
            <a href="/risk-radar" className="flex items-center gap-1 text-[11px] font-bold text-primary transition-transform hover:translate-x-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          }
        >
          <div className="space-y-2.5">
            {topRisk.map((s, i) => {
              const color = s.level === 'HIGH' ? C.red : s.level === 'MEDIUM' ? C.amber : C.green
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-sunken/40 px-4 py-3 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)] transition-all hover:border-[hsl(var(--risk-high))]/40 hover:bg-[hsl(var(--risk-high))]/6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                      style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color, boxShadow: `0 0 16px -8px ${color}` }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {s.department} · Sem {s.semester} · {s.reason}
                      </div>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2.5 py-1 font-display text-xs font-bold tabular-nums"
                    style={{
                      color,
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
                    }}
                  >
                    {s.score}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </Panel>

        <Panel
          index={1}
          title="Fee Collection by Dept"
          subtitle="Share of billed fees received"
          action={<span className="text-[11px] text-muted-foreground">Target 85%</span>}
        >
          <Bar3D
            height={172}
            depthPx={14}
            format={(v) => `${v}%`}
            data={feeByDepartment.map((d) => ({
              label: d.code,
              value: d.percentage,
              color: d.percentage >= 85 ? C.green : d.percentage >= 70 ? C.amber : C.red,
            }))}
          />
        </Panel>
      </div>

      {gradeDistribution.length > 0 && (
        <Panel index={0} title="Grade Distribution" subtitle="All recorded exam results" tilt={false}>
          <Bar3D
            height={180}
            depthPx={14}
            data={gradeDistribution.map((g) => ({
              label: g.grade,
              value: g.count,
              color: g.grade === 'F' ? C.red : g.grade === 'E' || g.grade === 'D' ? C.amber : C.green,
            }))}
          />
        </Panel>
      )}
    </div>
  )
}

/* ═══════════════════ Faculty ═══════════════════ */
function FacultyView({ data }: { data: FacultyDashboard }) {
  const { totals, attendance, atRisk, courses } = data
  const attColor = attendanceTone(attendance.average, attendance.threshold)

  // A course with no sessions has no attendance figure — showing it as 0% would
  // read as "nobody turns up" rather than "the register hasn't been opened yet".
  const withSessions = courses.filter((c) => c.sessions > 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="My Students"
          value={String(totals.students)}
          numeric={totals.students}
          color={C.orange}
          sub={`${data.faculty.department} department`}
          icon={<Users className="h-6 w-6" />}
          badge={`${totals.courses} courses`}
        />
        <KpiCard
          index={1}
          label="Avg Attendance"
          value={formatPercent(attendance.average)}
          numeric={attendance.average ?? 0}
          suffix="%"
          color={attColor}
          sub={`${attendance.belowThreshold} below ${attendance.threshold}%`}
          ring={{ pct: attendance.average ?? 0, color: attColor }}
          badge="My courses"
        />
        <KpiCard
          index={2}
          label="At-risk Students"
          value={String(atRisk)}
          numeric={atRisk}
          color={atRisk > 0 ? C.red : C.green}
          sub="Medium or high risk"
          icon={<AlertTriangle className="h-6 w-6" />}
          badge="Needs review"
        />
        <KpiCard
          index={3}
          label="Active Registers"
          value={`${withSessions.length}/${courses.length}`}
          color={C.cyan}
          sub="Courses with sessions recorded"
          icon={<CalendarCheck className="h-6 w-6" />}
        />
      </div>

      <section>
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Course-wise Attendance Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c, i) => (
            <SubjectCard
              key={c.id}
              index={i}
              name={c.name}
              code={c.code}
              pct={c.sessions > 0 ? c.percentage : null}
              meta={c.sessions > 0 ? `${c.sessions} sessions · ${c.enrolled} enrolled` : 'No sessions recorded'}
              status={
                c.sessions === 0
                  ? 'None'
                  : c.percentage >= attendance.threshold + 5
                    ? 'Green'
                    : c.percentage >= attendance.threshold
                      ? 'Amber'
                      : 'Alert'
              }
            />
          ))}
        </div>
      </section>

      {withSessions.length > 0 && (
        <Panel index={0} title="Class Attendance by Course" subtitle={`Threshold ${attendance.threshold}%`}>
          <Bar3D
            height={190}
            format={(v) => `${v}%`}
            data={withSessions.map((c) => ({
              label: c.code,
              value: c.percentage,
              color:
                c.percentage >= attendance.threshold + 5
                  ? C.green
                  : c.percentage >= attendance.threshold
                    ? C.amber
                    : C.red,
            }))}
          />
        </Panel>
      )}
    </div>
  )
}

/* ═══════════════════ Student ═══════════════════
 * No risk score anywhere on this view — risk is an admin/faculty concept and the
 * API deliberately withholds it from student accounts. The fourth tile shows
 * exam eligibility instead, which is the part that actually concerns a student.
 * ══════════════════════════════════════════════ */
function StudentView({ data }: { data: StudentDashboard }) {
  const { attendance, fees, academics, courses, scoreByCourse, recentResults } = data
  const attColor = attendanceTone(attendance.percentage, attendance.threshold)

  const feeColor =
    fees === null ? C.muted : fees.status === 'PAID' ? C.green : fees.status === 'PARTIAL' ? C.amber : C.red

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Attendance"
          value={formatPercent(attendance.percentage)}
          numeric={attendance.percentage ?? 0}
          suffix="%"
          color={attColor}
          sub={`${attendance.present} of ${attendance.total} classes`}
          ring={{ pct: attendance.percentage ?? 0, color: attColor }}
          badge={`Threshold ${attendance.threshold}%`}
        />
        <KpiCard
          index={1}
          label="Fee Status"
          value={fees?.status ?? 'NO SLAB'}
          color={feeColor}
          sub={fees ? `${formatCurrency(fees.paid)} of ${formatCurrency(fees.total)}` : 'No fee slab assigned'}
          sub2={fees && fees.pending > 0 ? `${formatCurrency(fees.pending)} outstanding` : undefined}
          icon={<Wallet className="h-6 w-6" />}
          badge={fees ? `Due ${new Date(fees.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : undefined}
        />
        <KpiCard
          index={2}
          label="Average Score"
          value={formatPercent(academics.averagePercentage)}
          numeric={academics.averagePercentage ?? 0}
          suffix="%"
          color={
            academics.averagePercentage === null
              ? C.muted
              : academics.averagePercentage >= 60
                ? C.green
                : academics.averagePercentage >= 40
                  ? C.amber
                  : C.red
          }
          sub={`Across ${academics.totalExams} exams`}
          icon={<GraduationCap className="h-6 w-6" />}
          badge="All semesters"
        />
        <KpiCard
          index={3}
          label="Exam Eligibility"
          value={attendance.eligible === null ? '—' : attendance.eligible ? 'ELIGIBLE' : 'AT RISK'}
          color={attendance.eligible === null ? C.muted : attendance.eligible ? C.green : C.red}
          sub={
            attendance.eligible === null
              ? 'No attendance recorded yet'
              : attendance.eligible
                ? `Above the ${attendance.threshold}% requirement`
                : `Below the ${attendance.threshold}% requirement`
          }
          icon={attendance.eligible ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
        />
      </div>

      {attendance.eligible === false && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--risk-high))]/8 px-5 py-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--risk-high))]" />
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--risk-high))]">Attendance below exam eligibility</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              You are at {formatPercent(attendance.percentage)} against a {attendance.threshold}% requirement. Speak to
              your faculty advisor about a recovery plan.
            </p>
          </div>
        </motion.div>
      )}

      <section>
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Attendance by Course
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c, i) => (
            <SubjectCard
              key={c.code}
              index={i}
              name={c.name}
              code={c.code}
              pct={c.percentage}
              meta={`${c.present}/${c.total} classes`}
              status={
                c.percentage >= attendance.threshold + 5
                  ? 'Green'
                  : c.percentage >= attendance.threshold
                    ? 'Amber'
                    : 'Alert'
              }
            />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {scoreByCourse.length > 0 && (
          <Panel index={0} title="Average Score by Course" subtitle="Across all exams in each course">
            <Bar3D
              height={180}
              format={(v) => `${v}%`}
              data={scoreByCourse.map((c) => ({
                label: c.code,
                value: c.percentage,
                color: c.percentage >= 60 ? C.green : c.percentage >= 40 ? C.amber : C.red,
              }))}
            />
          </Panel>
        )}

        <Panel index={1} title="Recent Results" subtitle="Most recent exams first">
          {recentResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No results published yet.</p>
          ) : (
            <div className="space-y-2">
              {recentResults.slice(0, 6).map((r, i) => {
                const pct = Math.round((r.marksObtained / r.maxMarks) * 100)
                const color = pct >= 60 ? C.green : pct >= 40 ? C.amber : C.red
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-sunken/40 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.examTitle}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {r.courseCode} · {r.courseName}
                      </div>
                    </div>
                    <span className="shrink-0 font-display text-sm font-bold tabular-nums" style={{ color }}>
                      {r.marksObtained}
                      <span className="text-muted-foreground">/{r.maxMarks}</span>
                    </span>
                    {r.grade && <Badge variant="outline">{r.grade}</Badge>}
                  </motion.div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ═══════════════════ page ═══════════════════ */
export function DashboardPage() {
  const { user } = useAuth()
  const depth = useDepth()
  const { data, loading, error, refetch } = useApi(() => dashboardApi.overview(), [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div>
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotateX: depth ? 14 : 0 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-7 flex flex-wrap items-end justify-between gap-4 preserve-3d"
      >
        <div style={depth ? { transform: 'translateZ(30px)' } : undefined}>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary" />
            Live · {user?.role ?? 'Guest'}
          </div>
          <h1 className="font-display text-[28px] font-bold leading-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.role === 'ADMIN'
              ? 'Overview of all departments for this semester.'
              : user?.role === 'FACULTY'
                ? `${user.department ?? 'Department'} overview across your courses.`
                : 'Your personal academic dashboard.'}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-md"
          style={depth ? { transform: 'translateZ(20px)' } : undefined}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Live from the database
        </span>
      </motion.div>

      {loading && <LoadingPanel label="Loading your dashboard…" />}
      {error && !loading && <ErrorState message={error} onRetry={refetch} />}

      {data && !loading && (
        <>
          {data.role === 'ADMIN' && <AdminView data={data} />}
          {data.role === 'FACULTY' && <FacultyView data={data} />}
          {data.role === 'STUDENT' && <StudentView data={data} />}
        </>
      )}
    </div>
  )
}

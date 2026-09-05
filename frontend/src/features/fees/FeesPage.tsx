import { useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Info, Search, Wallet } from 'lucide-react'
import { SectionHeading, StatTile, EmptyState, ErrorState, TableSkeleton, LoadingPanel } from '@/components/ui/Shared'
import { Badge } from '@/components/ui/Badge'
import { Button, SegButton } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { Bar3D, MeterBar } from '@/components/three-d/Charts3D'
import { useAuth } from '@/store/auth-context'
import { useApi, useDebounced } from '@/hooks/useApi'
import { dashboardApi, departmentsApi, feesApi, reportsApi, studentsApi } from '@/lib/endpoints'
import { apiErrorMessage } from '@/lib/api'
import { cn, FEE_BADGE, FEE_COLOR, formatCurrency, formatDate, fullName, toNumber } from '@/lib/utils'
import type { AdminDashboard, FeeStatus } from '@/types'

const PAGE_SIZE = 20

/* ═══════════════════ Admin ═══════════════════ */
function AdminFees() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | FeeStatus>('ALL')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const debouncedSearch = useDebounced(search)

  const departments = useApi(() => departmentsApi.list(), [])
  // The admin dashboard already computes billed/collected per department from the
  // same fee rules, so the roll-ups here reuse it rather than recomputing client-side.
  const overview = useApi(() => dashboardApi.overview(), [])
  const students = useApi(
    () =>
      studentsApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        departmentId: deptFilter === 'ALL' ? undefined : deptFilter,
      }),
    [page, debouncedSearch, deptFilter],
  )

  function updateFilter(fn: () => void) {
    fn()
    setPage(1)
  }

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await reportsApi.feeDefaulters(deptFilter === 'ALL' ? undefined : deptFilter)
    } catch (err) {
      setExportError(apiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const summary = overview.data?.role === 'ADMIN' ? (overview.data as AdminDashboard) : null
  const rows = students.data?.data ?? []
  const meta = students.data?.meta

  // Status filtering is client-side over the current page: fee status is a
  // computed value, not a Student column, so the API can't filter on it.
  const visible = statusFilter === 'ALL' ? rows : rows.filter((r) => r.feeStatus === statusFilter)

  return (
    <>
      <SectionHeading
        eyebrow="Finance"
        title="Fee Management"
        icon={<Wallet className="h-5 w-5" />}
        subtitle="Track fee collection and outstanding accounts across all departments."
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Defaulters (Excel)'}
          </Button>
        }
      />

      {exportError && (
        <div className="mb-4 rounded-xl border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--risk-high))]/8 px-4 py-3 text-xs text-[hsl(var(--risk-high))]">
          Export failed: {exportError}
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          index={0}
          label="Total Billed"
          value={summary ? formatCurrency(summary.fees.billed) : '—'}
          accent="amber"
          sub="All departments"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatTile
          index={1}
          label="Collected"
          value={summary ? formatCurrency(summary.fees.collected) : '—'}
          sub={summary ? `${summary.fees.collectionPct}% of billed` : 'Loading…'}
          accent="green"
          icon={<Wallet className="h-5 w-5" />}
          meter={summary?.fees.collectionPct ?? 0}
        />
        <StatTile
          index={2}
          label="Outstanding Accounts"
          value={summary?.fees.defaulters ?? '—'}
          numeric={summary?.fees.defaulters}
          sub={summary ? `${summary.fees.overdue} past the due date` : 'Loading…'}
          accent="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatTile
          index={3}
          label="Collection Rate"
          value={summary ? `${summary.fees.collectionPct}%` : '—'}
          numeric={summary?.fees.collectionPct}
          suffix="%"
          sub="Target 85%"
          accent={summary && summary.fees.collectionPct >= 85 ? 'green' : 'amber'}
          meter={summary?.fees.collectionPct ?? 0}
        />
      </div>

      {summary && summary.feeByDepartment.length > 0 && (
        <div className="mb-5">
          <ScrollDepth>
            <Card tilt={false} elevation={3}>
              <CardHeader>
                <div>
                  <CardTitle>Collection Rate by Department</CardTitle>
                  <CardSubtitle>Share of billed fees received · target 85%</CardSubtitle>
                </div>
              </CardHeader>
              <Bar3D
                height={180}
                depthPx={16}
                format={(v) => `${v}%`}
                data={summary.feeByDepartment.map((d) => ({
                  label: d.code,
                  value: d.percentage,
                  color:
                    d.percentage >= 85
                      ? 'hsl(var(--risk-low))'
                      : d.percentage >= 70
                        ? 'hsl(var(--risk-medium))'
                        : 'hsl(var(--risk-high))',
                }))}
              />
            </Card>
          </ScrollDepth>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search name or roll no…"
            value={search}
            onChange={(e) => updateFilter(() => setSearch(e.target.value))}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-40">
          <Select value={deptFilter} onChange={(e) => updateFilter(() => setDeptFilter(e.target.value))}>
            <option value="ALL">All Departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
        </div>
        <div className="mb-0.5 flex flex-wrap gap-2">
          {(['ALL', 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE'] as const).map((s) => (
            <SegButton key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s}
            </SegButton>
          ))}
        </div>
        <span className="ml-auto mb-2.5 text-xs text-muted-foreground">
          <span className="font-display font-bold text-foreground">{visible.length}</span>
          {statusFilter !== 'ALL' && ` of ${rows.length}`} on this page
        </span>
      </div>

      {students.loading && <TableSkeleton rows={8} cols={7} />}
      {students.error && !students.loading && (
        <div className="panel panel-raised">
          <ErrorState message={students.error} onRetry={students.refetch} />
        </div>
      )}

      {!students.loading && !students.error && (
        <ScrollDepth>
          {visible.length === 0 ? (
            <div className="panel panel-raised">
              <EmptyState
                message="No fee records match those filters."
                hint={statusFilter === 'ALL' ? 'Try a different department.' : 'Status filtering applies to this page only.'}
              />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Student</Th>
                  <Th>Dept / Sem</Th>
                  <Th>Billed</Th>
                  <Th>Paid</Th>
                  <Th>Progress</Th>
                  <Th>Balance</Th>
                  <Th>Due Date</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {visible.map((f, i) => {
                  const name = fullName(f)
                  if (f.feeStatus === null) {
                    return (
                      <Tr key={f.id} index={i}>
                        <Td>
                          <div className="text-sm font-semibold">{name}</div>
                          <div className="text-[11px] text-muted-foreground">{f.rollNumber}</div>
                        </Td>
                        <Td className="whitespace-nowrap text-sm">
                          {f.department.code} · Sem {f.currentSemester}
                        </Td>
                        <Td colSpan={6} className="text-xs text-muted-foreground">
                          No fee slab defined for this department / semester / batch.
                        </Td>
                      </Tr>
                    )
                  }

                  const total = f.feeTotal ?? 0
                  const paid = f.feePaid ?? 0
                  const balance = f.feePending ?? 0
                  const color = FEE_COLOR[f.feeStatus]
                  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0
                  const isOverdue = f.feeStatus === 'OVERDUE'

                  return (
                    <Tr key={f.id} index={i}>
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
                            <div className="text-[11px] text-muted-foreground">{f.rollNumber}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-sm">
                        <span className="font-semibold">{f.department.code}</span>
                        <span className="text-muted-foreground"> · Sem {f.currentSemester}</span>
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">{formatCurrency(total)}</Td>
                      <Td className="whitespace-nowrap tabular-nums" style={{ color: 'hsl(var(--risk-low))' }}>
                        {formatCurrency(paid)}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-16">
                            <MeterBar value={paidPct} color={color} />
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{paidPct}%</span>
                        </div>
                      </Td>
                      <Td
                        className="whitespace-nowrap font-display font-bold tabular-nums"
                        style={{ color: balance > 0 ? 'hsl(var(--risk-high))' : 'hsl(var(--risk-low))' }}
                      >
                        {balance > 0 ? `−${formatCurrency(balance)}` : '—'}
                      </Td>
                      <Td
                        className={cn('whitespace-nowrap text-[11px]', isOverdue && 'font-semibold')}
                        style={isOverdue ? { color: 'hsl(var(--risk-high))' } : undefined}
                      >
                        {formatDate(f.feeDueDate)}
                        {isOverdue && ' · overdue'}
                      </Td>
                      <Td>
                        <Badge variant={FEE_BADGE[f.feeStatus] ?? 'default'} pulse={isOverdue}>
                          {f.feeStatus}
                        </Badge>
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
    </>
  )
}

/* ═══════════════════ Student ═══════════════════ */
function StudentFees({ studentId }: { studentId: string }) {
  const status = useApi(() => feesApi.studentStatus(studentId), [studentId])
  const payments = useApi(() => feesApi.payments(studentId), [studentId])

  if (status.loading) return <LoadingPanel label="Loading your fee record…" />
  if (status.error) return <ErrorState message={status.error} onRetry={status.refetch} />

  const fee = status.data
  if (!fee) {
    return (
      <div className="panel panel-raised">
        <EmptyState
          message="No fee slab assigned yet."
          hint="Your department hasn’t published fees for this semester and batch."
        />
      </div>
    )
  }

  const color = FEE_COLOR[fee.status]
  const paidPct = fee.total > 0 ? Math.round((fee.paid / fee.total) * 100) : 0

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile index={0} label="Total Billed" value={formatCurrency(fee.total)} accent="amber" sub={`Semester ${fee.slab.semester}`} icon={<Wallet className="h-5 w-5" />} />
        <StatTile index={1} label="Paid" value={formatCurrency(fee.paid)} accent="green" sub={`${paidPct}% cleared`} meter={paidPct} />
        <StatTile index={2} label="Outstanding" value={formatCurrency(fee.pending)} accent={fee.pending > 0 ? 'red' : 'green'} sub={fee.pending > 0 ? 'Payable now' : 'Nothing due'} />
        <StatTile index={3} label="Status" value={fee.status} accent={fee.status === 'PAID' ? 'green' : fee.status === 'OVERDUE' ? 'red' : 'amber'} sub={`Due ${formatDate(fee.slab.dueDate)}`} />
      </div>

      <div className="mb-5">
        <ScrollDepth>
          <Card tilt={false} elevation={3}>
            <CardHeader>
              <div>
                <CardTitle>Fee Breakdown</CardTitle>
                <CardSubtitle>
                  Semester {fee.slab.semester} · batch {fee.slab.batchYear}
                </CardSubtitle>
              </div>
              <Badge variant={FEE_BADGE[fee.status] ?? 'default'} pulse={fee.status === 'OVERDUE'}>
                {fee.status}
              </Badge>
            </CardHeader>
            <div className="space-y-3">
              {[
                ['Tuition', fee.slab.tuitionFee],
                ['Laboratory', fee.slab.labFee],
                ['Library', fee.slab.libraryFee],
                ['Other', fee.slab.otherFee],
              ].map(([label, amount]) => (
                <div
                  key={label as string}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-sunken/40 px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(amount as number)}</span>
                </div>
              ))}
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Payment progress</span>
                  <span className="font-display font-bold tabular-nums" style={{ color }}>
                    {paidPct}%
                  </span>
                </div>
                <MeterBar value={paidPct} color={color} />
              </div>
            </div>
          </Card>
        </ScrollDepth>
      </div>

      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Payment History</h4>
      {payments.loading && <TableSkeleton rows={3} cols={4} />}
      {payments.error && <ErrorState message={payments.error} onRetry={payments.refetch} />}
      {!payments.loading && !payments.error && (
        <ScrollDepth>
          {(payments.data ?? []).length === 0 ? (
            <div className="panel panel-raised">
              <EmptyState message="No payments recorded yet." />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Mode</Th>
                  <Th>Reference</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(payments.data ?? []).map((p, i) => (
                  <Tr key={p.id} index={i}>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDate(p.paymentDate)}</Td>
                    <Td className="whitespace-nowrap font-display font-bold tabular-nums" style={{ color: 'hsl(var(--risk-low))' }}>
                      {formatCurrency(toNumber(p.amountPaid))}
                    </Td>
                    <Td className="text-sm">{p.paymentMode ?? '—'}</Td>
                    <Td className="text-[11px] text-muted-foreground">{p.transactionRef ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </ScrollDepth>
      )}
    </>
  )
}

/* ═══════════════════ Faculty ═══════════════════
 * Faculty accounts are not authorised for payment or per-student fee data (the
 * API returns 403), so this view shows the published slabs only rather than
 * rendering controls that would fail.
 * ══════════════════════════════════════════════ */
function FacultyFees() {
  const slabs = useApi(() => feesApi.slabs(), [])

  return (
    <>
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-5 py-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Individual student fee records are restricted to administrators. This view shows the published fee structure
          for reference.
        </p>
      </div>

      {slabs.loading && <TableSkeleton rows={6} cols={6} />}
      {slabs.error && <ErrorState message={slabs.error} onRetry={slabs.refetch} />}
      {!slabs.loading && !slabs.error && (
        <ScrollDepth>
          {(slabs.data ?? []).length === 0 ? (
            <div className="panel panel-raised">
              <EmptyState message="No fee slabs published." />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Department</Th>
                  <Th>Sem</Th>
                  <Th>Batch</Th>
                  <Th>Tuition</Th>
                  <Th>Other</Th>
                  <Th>Total</Th>
                  <Th>Due Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(slabs.data ?? []).map((s, i) => (
                  <Tr key={s.id} index={i}>
                    <Td className="text-sm font-semibold">{s.department.code}</Td>
                    <Td className="tabular-nums text-muted-foreground">{s.semester}</Td>
                    <Td className="tabular-nums text-muted-foreground">{s.batchYear}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatCurrency(s.tuitionFee)}</Td>
                    <Td className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatCurrency(s.labFee + s.libraryFee + s.otherFee)}
                    </Td>
                    <Td className="whitespace-nowrap font-display font-bold tabular-nums">
                      {formatCurrency(s.totalAmount)}
                    </Td>
                    <Td className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDate(s.dueDate)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </ScrollDepth>
      )}
    </>
  )
}

export function FeesPage() {
  const { user } = useAuth()

  if (user?.role === 'ADMIN') return <div><AdminFees /></div>

  return (
    <div>
      <SectionHeading
        eyebrow="Finance"
        title={user?.role === 'STUDENT' ? 'My Fees' : 'Fee Structure'}
        icon={<Wallet className="h-5 w-5" />}
        subtitle={
          user?.role === 'STUDENT'
            ? 'Your fee breakdown, payment progress and receipt history.'
            : 'Published fee slabs by department, semester and batch.'
        }
      />
      {user?.role === 'STUDENT' && user.studentId && <StudentFees studentId={user.studentId} />}
      {user?.role === 'FACULTY' && <FacultyFees />}
    </div>
  )
}

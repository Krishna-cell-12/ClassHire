import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tilt3D, Layer } from '@/components/three-d/Tilt3D'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { Counter, MeterBar } from '@/components/three-d/Charts3D'
import { useDepth } from '@/store/ui-context'

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <div className={cn('hairline', className)} />
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="hairline flex-1" />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="hairline flex-1" />
    </div>
  )
}

/**
 * Page title block. The heading floats forward on its own plane and the eyebrow
 * label sits behind it, which gives every page an immediate sense of depth
 * before any card has even scrolled in.
 */
export function SectionHeading({
  title,
  subtitle,
  eyebrow,
  action,
  icon,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  const depth = useDepth()
  return (
    <div className="scene mb-7">
      <motion.div
        initial={{ opacity: 0, y: 18, rotateX: depth ? 12 : 0 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-end justify-between gap-4 preserve-3d"
      >
        <div className="preserve-3d">
          {eyebrow && (
            <div
              className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary"
              style={depth ? { transform: 'translateZ(10px)' } : undefined}
            >
              <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary" />
              {eyebrow}
            </div>
          )}
          <h1
            className="flex items-center gap-3 font-display text-[26px] font-bold leading-tight text-foreground"
            style={depth ? { transform: 'translateZ(34px)' } : undefined}
          >
            {icon && (
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/14 text-primary shadow-[0_0_22px_-8px_hsl(var(--primary)),inset_0_1px_0_rgb(255_255_255/0.1)] ring-1 ring-primary/25">
                {icon}
              </span>
            )}
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-1.5 max-w-2xl text-sm text-muted-foreground"
              style={depth ? { transform: 'translateZ(16px)' } : undefined}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="shrink-0" style={depth ? { transform: 'translateZ(26px)' } : undefined}>
            {action}
          </div>
        )}
      </motion.div>
    </div>
  )
}

const accentToken: Record<string, string> = {
  amber: 'hsl(var(--risk-medium))',
  green: 'hsl(var(--risk-low))',
  red: 'hsl(var(--risk-high))',
  blue: 'hsl(var(--neon-cyan))',
  orange: 'hsl(var(--primary))',
}

const accentWash: Record<string, string> = {
  amber: 'kpi-amber',
  green: 'kpi-green',
  red: 'kpi-red',
  blue: 'kpi-blue',
  orange: 'kpi-orange',
}

/**
 * Compact metric slab: a coloured light-bar along the leading edge, the value on
 * the topmost plane, and an optional meter in a recessed channel.
 */
export function StatTile({
  label,
  value,
  sub,
  accent = 'orange',
  icon,
  index = 0,
  meter,
  numeric,
  prefix,
  suffix,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'amber' | 'green' | 'red' | 'blue' | 'orange'
  icon?: React.ReactNode
  index?: number
  /** 0–100; renders a meter under the value. */
  meter?: number
  /** Pass the raw number to animate the value counting up. */
  numeric?: number
  prefix?: string
  suffix?: string
}) {
  const color = accentToken[accent]
  return (
    <ScrollDepth index={index}>
      <Tilt3D max={6} lift={24} className="h-full">
        <div className={cn('panel h-full p-5', accentWash[accent])} style={{ ['--accent' as any]: color }}>
          {/* Leading edge light bar — inset from the corners, so it needs no clip */}
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
            style={{ background: color, boxShadow: `0 0 16px 1px ${color}` }}
          />
          <Layer z={22} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-2 font-display text-[28px] font-bold leading-none tabular-nums" style={{ color }}>
                {numeric !== undefined ? <Counter value={numeric} prefix={prefix} suffix={suffix} /> : value}
              </p>
              {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
            </div>
            {icon && (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-surface-raised/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_6px_14px_-8px_rgb(0_0_0/0.8)]"
                style={{ color }}
              >
                {icon}
              </div>
            )}
          </Layer>
          {meter !== undefined && (
            <Layer z={12} className="mt-4">
              <MeterBar value={meter} color={color} />
            </Layer>
          )}
        </div>
      </Tilt3D>
    </ScrollDepth>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />
}

/** Placeholder rows sized like the table they stand in for, to avoid layout jump. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel panel-raised space-y-3 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-5', c === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function LoadingPanel({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground', className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/40" />
      {label}
    </div>
  )
}

/**
 * Failure state for a panel or page. Distinct from EmptyState: "we couldn't load
 * this" is a different message from "there is nothing here", and this one offers
 * a way back.
 */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--risk-high))]/10 text-[hsl(var(--risk-high))]">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="font-display text-sm font-semibold text-foreground">Couldn’t load this</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-xl border border-border bg-surface-sunken/60 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No data found.', hint }: { message?: string; hint?: string }) {
  return (
    <div className="scene flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ opacity: 0, rotateX: 40, y: 30 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="preserve-3d"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 animate-float items-center justify-center rounded-3xl border border-border bg-surface-raised/60 text-muted-foreground shadow-elev-3">
          <svg className="h-7 w-7 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="font-display text-sm font-semibold text-foreground">{message}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </motion.div>
    </div>
  )
}

export function ProgressBar({
  value,
  max = 100,
  colorClass,
  color,
}: {
  value: number
  max?: number
  colorClass?: string
  color?: string
}) {
  // Legacy callers pass Tailwind classes; new ones pass a raw colour token.
  if (colorClass) {
    const pct = Math.min(100, Math.round((value / max) * 100))
    return (
      <div className="progress-bar w-full">
        <motion.div
          className={cn('progress-bar-fill', colorClass)}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    )
  }
  return <MeterBar value={value} max={max} color={color} />
}

/** Small labelled row used inside detail panels. */
export function FactRow({
  label,
  children,
  tone = 'neutral',
}: {
  label: string
  children: React.ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) {
  const toneClass = {
    neutral: 'text-foreground',
    good: 'text-[hsl(var(--risk-low))]',
    warn: 'text-[hsl(var(--risk-medium))]',
    bad: 'text-[hsl(var(--risk-high))]',
  }[tone]
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-sunken/40 px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', toneClass)}>{children}</span>
    </div>
  )
}

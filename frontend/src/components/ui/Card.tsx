import { cn } from '@/lib/utils'
import { Tilt3D, Layer } from '@/components/three-d/Tilt3D'

interface CardProps {
  children: React.ReactNode
  className?: string
  /** Adds pointer-tracked tilt. On by default — pass false for dense/table panels. */
  tilt?: boolean
  /** Peak tilt in degrees. */
  max?: number
  /** Elevation of the resting slab. */
  elevation?: 1 | 2 | 3
  /** Accent wash across the card face. */
  accent?: 'orange' | 'green' | 'amber' | 'red' | 'blue' | 'none'
  /** Removes inner padding (for tables that bleed to the edge). */
  flush?: boolean
  onClick?: () => void
}

const accentClass: Record<string, string> = {
  none: '',
  orange: 'kpi-orange',
  green: 'kpi-green',
  amber: 'kpi-amber',
  red: 'kpi-red',
  blue: 'kpi-blue',
}

const elevClass: Record<number, string> = {
  1: 'panel-flush',
  2: '',
  3: 'panel-raised',
}

export function Card({
  children,
  className,
  tilt = true,
  max = 5,
  elevation = 2,
  accent = 'none',
  flush = false,
  onClick,
}: CardProps) {
  const body = (
    <div
      className={cn(
        // No `overflow-hidden`: it would flatten the card's 3D context and kill
        // the <Layer> parallax. Decorations clip themselves instead.
        'panel h-full',
        elevClass[elevation],
        accentClass[accent],
        !flush && 'p-5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/*
        z={0} here, deliberately: nesting a second `preserve-3d` context (Layer)
        inside Tilt3D's own `preserve-3d` breaks native click/hit-testing for
        any button, link or input that ends up inside it — confirmed in
        Chromium regardless of the actual transform value, even translateZ(0).
        Card wraps arbitrary consumer content that often includes real
        controls (see AttendancePage, NlQueryPage), so this can't be a
        per-page opt-in; it has to be safe by default at the source.
      */}
      <Layer z={0} className="h-full">
        {children}
      </Layer>
    </div>
  )

  if (!tilt) return onClick ? <div onClick={onClick}>{body}</div> : body

  return (
    <Tilt3D max={max} lift={22} onClick={onClick} className="h-full">
      {body}
    </Tilt3D>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('font-display text-sm font-bold text-foreground', className)}>{children}</h3>
}

export function CardSubtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('mt-0.5 text-xs text-muted-foreground', className)}>{children}</p>
}

export function CardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('font-display text-3xl font-bold tabular-nums', className)}>{children}</div>
}

/** Muted inset well — for nested rows inside a card. */
export function Well({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-surface-sunken/50 shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

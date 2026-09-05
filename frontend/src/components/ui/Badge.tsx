import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'low' | 'medium' | 'high' | 'paid' | 'pending' | 'overdue' | 'outline' | 'primary'
  /** Adds a slow pulse — reserve it for things that need attention. */
  pulse?: boolean
  className?: string
}

const variantMap: Record<string, string> = {
  default: 'bg-secondary/70 text-secondary-foreground border border-border',
  outline: 'border border-border text-muted-foreground bg-transparent',
  primary:
    'bg-primary/14 text-primary border border-primary/35 shadow-[0_0_14px_-6px_hsl(var(--primary))]',
  low: 'risk-low',
  medium: 'risk-medium',
  high: 'risk-high',
  paid: 'bg-[hsl(var(--risk-low))]/14 text-[hsl(var(--risk-low))] border border-[hsl(var(--risk-low))]/35 shadow-[0_0_14px_-6px_hsl(var(--risk-low))]',
  pending:
    'bg-[hsl(var(--risk-medium))]/14 text-[hsl(var(--risk-medium))] border border-[hsl(var(--risk-medium))]/35 shadow-[0_0_14px_-6px_hsl(var(--risk-medium))]',
  overdue:
    'bg-[hsl(var(--risk-high))]/14 text-[hsl(var(--risk-high))] border border-[hsl(var(--risk-high))]/35 shadow-[0_0_14px_-6px_hsl(var(--risk-high))]',
}

export function Badge({ children, variant = 'default', pulse, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        'backdrop-blur-sm',
        variantMap[variant] ?? variantMap.default,
        className,
      )}
    >
      {pulse && <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Small keycap, used for the ⌘K hint. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--border)),inset_0_1px_0_rgb(255_255_255/0.06)]">
      {children}
    </kbd>
  )
}

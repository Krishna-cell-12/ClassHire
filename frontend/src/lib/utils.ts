import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn/ui class merger. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Prisma serialises Decimal columns as strings; coerce before doing arithmetic. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value)
}

export function formatCurrency(value: string | number | null | undefined): string {
  return currency.format(toNumber(value))
}

/** Renders an em-dash for a genuinely absent figure rather than a misleading 0%. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—'
  const rounded = Number(value.toFixed(digits))
  return `${rounded}%`
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`
}

/**
 * Stable colour per department. Keyed by index rather than by code so it works
 * for whatever departments the database actually holds — the palette is fixed,
 * so a given department keeps its colour across every chart on a page.
 */
const DEPT_PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--neon-cyan))',
  'hsl(var(--neon-violet))',
  'hsl(var(--risk-low))',
  'hsl(var(--risk-medium))',
  'hsl(200 82% 55%)',
  'hsl(280 70% 60%)',
  'hsl(160 60% 45%)',
]

export function deptColor(index: number): string {
  return DEPT_PALETTE[index % DEPT_PALETTE.length]
}

/** Colour for an attendance figure against the eligibility threshold. */
export function attendanceColor(pct: number | null, threshold = 75): string {
  if (pct === null) return 'hsl(var(--muted-foreground))'
  return pct < threshold ? 'hsl(var(--risk-high))' : 'hsl(var(--risk-low))'
}

export const FEE_BADGE: Record<string, 'paid' | 'pending' | 'overdue' | 'medium'> = {
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'medium',
  OVERDUE: 'overdue',
}

export const FEE_COLOR: Record<string, string> = {
  PAID: 'hsl(var(--risk-low))',
  PENDING: 'hsl(var(--risk-medium))',
  PARTIAL: 'hsl(var(--risk-medium))',
  OVERDUE: 'hsl(var(--risk-high))',
}

export const RISK_COLOR: Record<string, string> = {
  LOW: 'hsl(var(--risk-low))',
  MEDIUM: 'hsl(var(--risk-medium))',
  HIGH: 'hsl(var(--risk-high))',
}

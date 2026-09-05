import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

/**
 * Buttons are treated as physical keys: a lit top bevel, a coloured underside
 * that acts as the key's "throw", and a press that actually travels down in Z.
 */
const variantClasses: Record<string, string> = {
  primary: [
    'bg-primary-sheen text-primary-foreground font-semibold',
    'shadow-[0_1px_0_hsl(var(--primary)/0.9)_inset,0_-2px_0_hsl(18_92%_38%)_inset,0_6px_16px_-6px_hsl(var(--primary)/0.85),0_2px_4px_rgb(0_0_0/0.3)]',
    'hover:brightness-110 hover:shadow-[0_1px_0_hsl(var(--primary)/0.9)_inset,0_-2px_0_hsl(18_92%_38%)_inset,0_10px_24px_-8px_hsl(var(--primary)/0.95),0_3px_6px_rgb(0_0_0/0.35)]',
  ].join(' '),
  secondary: 'panel !rounded-xl text-foreground hover:border-primary/40 hover:text-primary',
  ghost: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  danger:
    'bg-destructive/12 text-[hsl(var(--risk-high))] border border-[hsl(var(--risk-high))]/35 hover:bg-destructive/20 shadow-[0_0_18px_-8px_hsl(var(--risk-high))]',
  outline:
    'border border-border bg-surface/60 text-foreground backdrop-blur-md hover:border-primary/45 hover:text-primary hover:shadow-[0_0_18px_-8px_hsl(var(--primary))]',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'group/btn relative inline-flex select-none items-center justify-center gap-2 overflow-hidden',
        'transition-all duration-150 ease-out will-change-transform',
        'active:translate-y-px active:brightness-95',
        'disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Specular sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-white/20 opacity-0 transition-opacity duration-200 group-hover/btn:animate-sweep group-hover/btn:opacity-100"
      />
      {isLoading && (
        <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

/** Pill-shaped segmented control, used for the status/bucket filters. */
export function SegButton({
  active,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'relative rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200',
        active
          ? 'bg-primary/18 text-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.3),0_6px_16px_-8px_hsl(var(--primary))] ring-1 ring-primary/40'
          : 'border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

import { cn } from '@/lib/utils'

/** Shared "carved into the surface" treatment for all form fields. */
const fieldBase = [
  'w-full rounded-xl px-3 py-2.5 text-sm text-foreground transition-all duration-200',
  'bg-surface-sunken/70 backdrop-blur-md',
  'border border-border',
  'shadow-[inset_0_2px_4px_rgb(0_0_0/0.35),inset_0_0_0_1px_rgb(255_255_255/0.03)]',
  'placeholder:text-muted-foreground/55',
  'focus:border-primary/60 focus:outline-none',
  'focus:shadow-[inset_0_2px_4px_rgb(0_0_0/0.35),0_0_0_3px_hsl(var(--primary)/0.16),0_0_22px_-8px_hsl(var(--primary))]',
].join(' ')

const labelBase = 'text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className={labelBase}>{label}</label>}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          className={cn(
            fieldBase,
            icon && 'pl-10',
            error && 'border-[hsl(var(--risk-high))]/60 focus:border-[hsl(var(--risk-high))]',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[hsl(var(--risk-high))]">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

export function Select({ label, children, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className={labelBase}>{label}</label>}
      <div className="relative">
        <select className={cn(fieldBase, 'cursor-pointer appearance-none pr-9', className)} {...props}>
          {children}
        </select>
        <svg
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export function Textarea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className={labelBase}>{label}</label>}
      <textarea className={cn(fieldBase, 'resize-none', className)} {...props} />
    </div>
  )
}

/**
 * Physical toggle switch — a recessed track with a raised, travelling knob.
 * Used for the theme and 3D-mode controls in the Topbar.
 */
export function Switch({
  checked,
  onChange,
  label,
  icons,
}: {
  checked: boolean
  onChange: () => void
  label: string
  icons?: [React.ReactNode, React.ReactNode]
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={cn(
        'relative flex h-7 w-[52px] shrink-0 items-center rounded-full px-1 transition-colors duration-300',
        'shadow-[inset_0_2px_4px_rgb(0_0_0/0.45),inset_0_0_0_1px_hsl(var(--border))]',
        checked ? 'bg-primary/25' : 'bg-surface-sunken',
      )}
    >
      {icons && (
        <>
          <span className="pointer-events-none absolute left-1.5 flex h-4 w-4 items-center justify-center text-[10px] text-muted-foreground">
            {icons[0]}
          </span>
          <span className="pointer-events-none absolute right-1.5 flex h-4 w-4 items-center justify-center text-[10px] text-muted-foreground">
            {icons[1]}
          </span>
        </>
      )}
      <span
        className={cn(
          'relative z-10 h-5 w-5 rounded-full transition-transform duration-300 ease-spring',
          'bg-gradient-to-b from-white/95 to-white/70 shadow-[0_2px_5px_rgb(0_0_0/0.5),inset_0_1px_0_rgb(255_255_255/0.9)]',
          checked && 'translate-x-[24px] from-primary to-[hsl(18_92%_45%)] shadow-[0_0_14px_hsl(var(--primary)),0_2px_5px_rgb(0_0_0/0.5)]',
        )}
      />
    </button>
  )
}

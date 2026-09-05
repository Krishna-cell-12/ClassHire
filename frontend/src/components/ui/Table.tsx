import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDepth } from '@/store/ui-context'

/**
 * Tables sit in their own shallow scene: the header is a sticky raised plate and
 * each row lifts slightly toward the viewer on hover, so a long list still has
 * the same physical language as the cards above it.
 */
export function Table({
  children,
  className,
  maxHeight,
}: {
  children: React.ReactNode
  className?: string
  maxHeight?: number | string
}) {
  return (
    <div className="panel panel-raised overflow-hidden">
      <div
        className="w-full overflow-auto"
        style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
      >
        <table className={cn('data-table w-full border-collapse text-sm', className)}>{children}</table>
      </div>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-border">{children}</thead>
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border/45">{children}</tbody>
}

export function Tr({
  children,
  className,
  onClick,
  index = 0,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  /** Row position — used to stagger the entry animation. */
  index?: number
}) {
  const depth = useDepth()
  return (
    <motion.tr
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 14) * 0.025, ease: [0.16, 1, 0.3, 1] }}
      whileHover={depth ? { scale: 1.006 } : undefined}
      className={cn(onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </motion.tr>
  )
}

export function Td({
  children,
  className,
  style,
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  colSpan?: number
}) {
  return (
    <td className={cn('px-4 py-3 align-middle text-foreground/90', className)} style={style} colSpan={colSpan}>
      {children}
    </td>
  )
}

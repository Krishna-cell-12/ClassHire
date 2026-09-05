import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDepth } from '@/store/ui-context'

/* ══════════════════════════════════════════════════════════
   Counter — springs a number up when it scrolls into view
   ══════════════════════════════════════════════════════════ */
export function Counter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 70, damping: 22, mass: 0.9 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(
    () =>
      spring.on('change', (v) =>
        setDisplay(v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
      ),
    [spring, decimals],
  )

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════
   Bar3D — extruded bars built from three real CSS planes
   (front / top / right side), so they turn with the scene.
   ══════════════════════════════════════════════════════════ */
export interface Bar3DDatum {
  label: string
  value: number
  color?: string
}

export function Bar3D({
  data,
  height = 190,
  depthPx = 16,
  format = (v: number) => String(v),
  className,
}: {
  data: Bar3DDatum[]
  height?: number
  depthPx?: number
  format?: (v: number) => string
  className?: string
}) {
  const is3D = useDepth()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const max = Math.max(...data.map((d) => d.value), 1)
  const d = is3D ? depthPx : 0

  return (
    <div
      ref={ref}
      className={cn('relative w-full', className)}
      style={{ perspective: is3D ? '900px' : undefined, perspectiveOrigin: '50% 120%' }}
    >
      <div
        className="flex items-end justify-between gap-2"
        style={{ height, transformStyle: 'preserve-3d', transform: is3D ? 'rotateX(16deg)' : undefined }}
      >
        {data.map((bar, i) => {
          const pct = (bar.value / max) * 100
          const color = bar.color ?? 'hsl(var(--primary))'
          return (
            <div key={`${bar.label}-${i}`} className="group/bar flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover/bar:opacity-100">
                {format(bar.value)}
              </span>
              <motion.div
                className="bar3d w-full max-w-[42px]"
                initial={{ height: 0 }}
                animate={{ height: inView ? `${Math.max(pct, 2)}%` : 0 }}
                transition={{ duration: 0.9, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* front face */}
                <div
                  className="bar3d-face transition-[filter] duration-200 group-hover/bar:brightness-125"
                  style={{
                    background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 62%, black))`,
                    boxShadow: `0 0 18px -6px ${color}`,
                  }}
                />
                {/* top cap */}
                {is3D && (
                  <div className="bar3d-top" style={{ height: d, background: color }} />
                )}
                {/* right side */}
                {is3D && (
                  <div className="bar3d-side" style={{ width: d, background: color }} />
                )}
              </motion.div>
              <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground">{bar.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Ring3D — dial with a recessed track and a glowing arc
   ══════════════════════════════════════════════════════════ */
export function Ring3D({
  pct,
  size = 76,
  stroke = 7,
  color = 'hsl(var(--primary))',
  label,
}: {
  pct: number
  size?: number
  stroke?: number
  color?: string
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const is3D = useDepth()

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: size, height: size, transform: is3D ? 'translateZ(18px)' : undefined }}
    >
      <svg width={size} height={size} className="circle-progress overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: inView ? circ * (1 - pct / 100) : circ }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {Math.round(pct)}%
        </span>
        {label && <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Donut3D — tilted ring chart with a stacked "thickness" pass
   ══════════════════════════════════════════════════════════ */
export function Donut3D({
  data,
  size = 160,
  thickness = 26,
}: {
  data: { name: string; value: number; color: string }[]
  size?: number
  thickness?: number
}) {
  const is3D = useDepth()
  const total = data.reduce((a, d) => a + d.value, 0) || 1

  // Build a conic-gradient from the slices; the extra offset copy underneath is
  // what gives the ring visible physical depth when the disc is tilted back.
  let acc = 0
  const stops = data
    .map((d) => {
      const from = (acc / total) * 360
      acc += d.value
      const to = (acc / total) * 360
      return `${d.color} ${from}deg ${to}deg`
    })
    .join(', ')

  const disc = (extra: React.CSSProperties = {}) => (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: `conic-gradient(${stops})`,
        mask: `radial-gradient(circle, transparent ${size / 2 - thickness}px, black ${size / 2 - thickness + 1}px)`,
        WebkitMask: `radial-gradient(circle, transparent ${size / 2 - thickness}px, black ${size / 2 - thickness + 1}px)`,
        ...extra,
      }}
    />
  )

  return (
    <div className="relative" style={{ width: size, height: size, perspective: is3D ? '700px' : undefined }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d', transform: is3D ? 'rotateX(58deg)' : undefined }}
        initial={{ rotate: -90, opacity: 0 }}
        whileInView={{ rotate: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* extrusion: stacked copies pushed down in Z */}
        {is3D &&
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `translateZ(-${(i + 1) * 2.6}px)` }}>
              {disc({ filter: `brightness(${0.62 - i * 0.05})` })}
            </div>
          ))}
        {disc()}
      </motion.div>

      {/* Ambient bloom under the disc */}
      {is3D && (
        <div
          className="pointer-events-none absolute inset-x-2 bottom-0 h-6 rounded-[50%] blur-xl"
          style={{ background: 'radial-gradient(ellipse, rgb(0 0 0 / .5), transparent 70%)' }}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Sparkline — glowing animated stroke with a gradient fill
   ══════════════════════════════════════════════════════════ */
export function Sparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 30,
  width = 84,
  fill = true,
}: {
  data: number[]
  color?: string
  height?: number
  width?: number
  fill?: boolean
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const id = `sl-${Math.abs(data.reduce((a, b, i) => a + b * (i + 1), 0)).toString(36)}`

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 5) - 2.5
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} ${width},${height} 0,${height}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible" style={{ color }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={area} fill={`url(#${id})`} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-path"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color}>
        <animate attributeName="r" values="2.4;3.6;2.4" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   MeterBar — recessed channel + lit fill, animated on view
   ══════════════════════════════════════════════════════════ */
export function MeterBar({
  value,
  max = 100,
  color = 'hsl(var(--primary))',
  className,
}: {
  value: number
  max?: number
  color?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('progress-bar w-full', className)}>
      <motion.div
        className="progress-bar-fill"
        style={{ background: color, color }}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

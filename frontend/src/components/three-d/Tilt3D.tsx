import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type MotionStyle } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDepth } from '@/store/ui-context'

const SPRING = { stiffness: 220, damping: 26, mass: 0.6 }

export interface Tilt3DProps {
  children: React.ReactNode
  className?: string
  /** Peak rotation, in degrees, reached at the corners. */
  max?: number
  /** How far the slab travels toward the viewer while hovered, in px. */
  lift?: number
  /** Cursor-tracked specular highlight. */
  glare?: boolean
  /** Soft contact shadow cast on the scene floor behind the slab. */
  shadow?: boolean
  style?: MotionStyle
  onClick?: () => void
}

/**
 * Wraps content in a slab that rotates toward the pointer.
 *
 * Rotation is applied to a `preserve-3d` container, so anything inside with a
 * `translateZ` (see `<Layer>`) genuinely separates from the card face as it
 * turns — that parallax between layers is what reads as depth rather than as a
 * flat image being skewed.
 *
 * Collapses to a plain div's behaviour when the 3D switch is off.
 */
export function Tilt3D({
  children,
  className,
  max = 7,
  lift = 26,
  glare = true,
  shadow = true,
  style,
  onClick,
}: Tilt3DProps) {
  const depth = useDepth()
  const ref = useRef<HTMLDivElement>(null)
  // While a pointer is pressed, the tilt is frozen exactly where it is. Without
  // this, the spring keeps interpolating rotation between mousedown and
  // mouseup — on a large card that visibly shifts descendants by tens of
  // pixels, which is enough for the browser to hit-test a different element
  // on mouseup than it did on mousedown, so no "click" ever gets synthesized
  // and buttons (including submit buttons) silently stop responding.
  const locked = useRef(false)

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const hover = useMotionValue(0)

  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)
  const sh = useSpring(hover, SPRING)

  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  const translateZ = useTransform(sh, [0, 1], [0, lift])

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!depth || locked.current) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    px.set(x)
    py.set(y)
    // Feed the glare gradient directly through CSS vars: no React re-render.
    el.style.setProperty('--gx', `${x * 100}%`)
    el.style.setProperty('--gy', `${y * 100}%`)
  }

  function reset() {
    if (locked.current) return
    px.set(0.5)
    py.set(0.5)
    hover.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerEnter={() => depth && !locked.current && hover.set(1)}
      onPointerLeave={reset}
      onPointerDown={() => {
        locked.current = true
        // Setting the flag alone isn't enough: the springs may already be
        // mid-flight toward a target set by the last mousemove, and they'll
        // keep interpolating for several more frames on their own. Stop them
        // outright so the transform is bit-for-bit identical at mouseup.
        sx.stop()
        sy.stop()
        sh.stop()
      }}
      onPointerUp={() => { locked.current = false }}
      onPointerCancel={() => { locked.current = false }}
      onClick={onClick}
      className={cn('group/tilt relative', depth && 'preserve-3d', className)}
      // Self-perspective rather than relying on an unbroken `.scene` ancestry:
      // any intermediate grid/wrapper without preserve-3d would otherwise
      // flatten the chain and make the tilt read as a flat shear.
      style={depth ? { rotateX, rotateY, translateZ, ...style } : style}
    >
      {shadow && depth && <span aria-hidden className="contact-shadow" />}
      {children}
      {glare && <span aria-hidden className="glare" />}
    </motion.div>
  )
}

/**
 * A child plane floating above its `Tilt3D` parent's face.
 * Only meaningful inside a `preserve-3d` ancestor.
 */
export function Layer({
  z = 20,
  className,
  children,
  as: As = 'div',
}: {
  z?: number
  className?: string
  children: React.ReactNode
  as?: 'div' | 'span' | 'header' | 'footer'
}) {
  const depth = useDepth() && z !== 0
  return (
    <As
      className={cn('relative', depth && 'preserve-3d', className)}
      style={depth ? { transform: `translateZ(${z}px)` } : undefined}
    >
      {children}
    </As>
  )
}

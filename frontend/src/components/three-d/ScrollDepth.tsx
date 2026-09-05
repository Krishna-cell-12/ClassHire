import { useRef } from 'react'
import { motion, useInView, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDepth } from '@/store/ui-context'

export interface ScrollDepthProps {
  children: React.ReactNode
  className?: string
  /** Position within a row/grid — staggers the entry so cards arrive in sequence. */
  index?: number
  /** Degrees of X rotation the card starts at, before it swings flat. */
  rotate?: number
  /** How far back in Z the card starts, in px. */
  z?: number
  /** Vertical travel, in px. */
  y?: number
  /** Which edge it hinges from. */
  origin?: 'bottom' | 'top' | 'center'
}

const SPRING = { stiffness: 140, damping: 30, mass: 0.8 }

/**
 * Scroll-scrubbed 3D reveal.
 *
 * The card's rotation, Z position and opacity are bound to *where it is in the
 * viewport*, not to a one-shot mount timer — so scrolling back up genuinely
 * pushes cards back into depth. An `useInView` latch is max()'d over the scroll
 * progress so cards still settle on pages too short to scroll.
 */
export function ScrollDepth({
  children,
  className,
  index = 0,
  rotate = 14,
  z = 180,
  y = 44,
  origin = 'bottom',
}: ScrollDepthProps) {
  const depth = useDepth()
  const ref = useRef<HTMLDivElement>(null)

  // Later cards in a row start their reveal a little further down the viewport.
  const stagger = Math.min(index, 5) * 0.045

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start ${(0.98 - stagger).toFixed(3)}`, `start ${(0.55 - stagger).toFixed(3)}`] as any,
  })

  const inView = useInView(ref, { amount: 0.18, once: true })
  const latch = useSpring(inView ? 1 : 0, SPRING)

  // Whichever is further along wins, so nothing can get stranded mid-reveal.
  const raw = useTransform([scrollYProgress, latch] as MotionValue<number>[], (v: number[]) =>
    Math.max(v[0] ?? 0, v[1] ?? 0),
  )
  const p = useSpring(raw, SPRING)

  const rotateX = useTransform(p, [0, 1], [rotate, 0])
  const translateZ = useTransform(p, [0, 1], [-z, 0])
  const translateY = useTransform(p, [0, 1], [y, 0])
  const opacity = useTransform(p, [0, 0.55], [0, 1])
  const blur = useTransform(p, [0, 0.7], [6, 0])
  const filter = useTransform(blur, (b) => (b < 0.15 ? 'none' : `blur(${b}px)`))

  if (!depth) {
    // Normal mode still gets a tasteful fade-up, just nothing dimensional.
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      // Deliberately NOT `preserve-3d`: ScrollDepth is almost always the outer
      // wrapper around a Tilt3D, which establishes its own nested preserve-3d
      // context for its <Layer> children. Two stacked preserve-3d ancestors
      // above a native button/link breaks Chromium's click hit-testing for it
      // — confirmed empirically, and independent of the actual transform
      // values (see Card.tsx for the full writeup). ScrollDepth's own
      // rotateX/translateZ still animate correctly without preserve-3d; the
      // only cost is that Tilt3D's content renders as a flattened plane
      // *during* the brief scroll-reveal, which settles to identity almost
      // immediately and is never visible while the user is actually clicking.
      className={cn(className)}
      style={{
        transformPerspective: 1400,
        rotateX,
        translateZ,
        y: translateY,
        opacity,
        filter,
        transformOrigin: origin === 'center' ? '50% 50%' : origin === 'top' ? '50% 0%' : '50% 100%',
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Parallax helper — moves an element against the scroll at a fraction of the
 * page's rate. Used for headers and backdrop layers.
 */
export function useParallax(distance = 60) {
  const { scrollY } = useScroll()
  return useTransform(scrollY, [0, 1200], [0, -distance])
}

/** Thin progress rail bound to the whole document's scroll. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.4 })
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary via-neon-orange to-neon-violet shadow-[0_0_12px_hsl(var(--primary))]"
    />
  )
}

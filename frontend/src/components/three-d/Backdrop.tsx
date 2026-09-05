import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useDepth } from '@/store/ui-context'

/**
 * The world the UI floats in: three drifting aurora blobs, a receding grid
 * floor, and a starfield — all pure CSS gradients so there's no WebGL context,
 * no texture download, and nothing to fail on a conference projector.
 *
 * Each layer parallaxes at a different rate against the page scroll, which is
 * what makes the foreground cards feel like they're travelling through a space
 * rather than sliding on a sheet.
 */
export function Backdrop() {
  const depth = useDepth()
  const { scrollY } = useScroll()
  const cfg = { stiffness: 80, damping: 30, mass: 0.6 }

  const auroraY = useSpring(useTransform(scrollY, [0, 2000], [0, depth ? -180 : 0]), cfg)
  const gridY = useSpring(useTransform(scrollY, [0, 2000], [0, depth ? 260 : 0]), cfg)
  const starY = useSpring(useTransform(scrollY, [0, 2000], [0, depth ? -70 : 0]), cfg)
  const gridOpacity = useTransform(scrollY, [0, 700], [1, 0.25])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain">
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--surface) / 0.9), transparent 60%), ' +
            'radial-gradient(90% 60% at 100% 100%, hsl(var(--surface-sunken) / 0.8), transparent 70%)',
        }}
      />

      {/* Aurora blobs */}
      <motion.div className="absolute inset-0" style={{ y: auroraY }}>
        <div
          className="absolute -left-[15%] -top-[20%] h-[70vh] w-[70vh] animate-aurora rounded-full blur-[110px]"
          style={{ background: 'radial-gradient(circle, hsl(var(--aurora-1) / var(--aurora-alpha)), transparent 68%)' }}
        />
        <div
          className="absolute -right-[10%] top-[8%] h-[62vh] w-[62vh] animate-aurora rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--aurora-2) / var(--aurora-alpha)), transparent 68%)',
            animationDelay: '-8s',
          }}
        />
        <div
          className="absolute bottom-[-18%] left-[28%] h-[58vh] w-[58vh] animate-aurora rounded-full blur-[130px]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--aurora-3) / var(--aurora-alpha)), transparent 68%)',
            animationDelay: '-16s',
          }}
        />
      </motion.div>

      {/* Starfield */}
      <motion.div
        className="absolute inset-0 opacity-60"
        style={{
          y: starY,
          backgroundImage:
            'radial-gradient(1px 1px at 12% 22%, hsl(var(--foreground) / 0.5), transparent), ' +
            'radial-gradient(1px 1px at 78% 14%, hsl(var(--foreground) / 0.4), transparent), ' +
            'radial-gradient(1.4px 1.4px at 42% 66%, hsl(var(--primary) / 0.5), transparent), ' +
            'radial-gradient(1px 1px at 88% 74%, hsl(var(--foreground) / 0.35), transparent), ' +
            'radial-gradient(1px 1px at 26% 88%, hsl(var(--foreground) / 0.3), transparent), ' +
            'radial-gradient(1.2px 1.2px at 62% 38%, hsl(var(--neon-cyan) / 0.4), transparent)',
        }}
      />

      {/* Receding grid floor — a real rotateX plane, not a faked gradient. */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[55vh]"
        style={{ y: gridY, opacity: gridOpacity, perspective: '340px', perspectiveOrigin: '50% 0%' }}
      >
        <div
          className="absolute inset-x-[-60%] bottom-[-40%] top-0 animate-grid-drift"
          style={{
            transform: depth ? 'rotateX(74deg)' : 'none',
            transformOrigin: '50% 0%',
            backgroundImage:
              'linear-gradient(hsl(var(--grid-line) / var(--grid-alpha)) 1px, transparent 1px), ' +
              'linear-gradient(90deg, hsl(var(--grid-line) / var(--grid-alpha)) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to bottom, transparent, black 22%, black 62%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 22%, black 62%, transparent)',
          }}
        />
      </motion.div>

      {/* Horizon glow + vignette */}
      <div
        className="absolute inset-x-0 bottom-[38vh] h-px"
        style={{ boxShadow: '0 0 90px 18px hsl(var(--primary) / 0.18)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(130% 90% at 50% 40%, transparent 45%, rgb(0 0 0 / var(--vignette)) 100%)' }}
      />
    </div>
  )
}

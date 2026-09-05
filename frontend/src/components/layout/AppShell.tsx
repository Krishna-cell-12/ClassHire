import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Backdrop } from '@/components/three-d/Backdrop'
import { ScrollProgressBar } from '@/components/three-d/ScrollDepth'
import { useDepth } from '@/store/ui-context'

/**
 * The shell deliberately lets the *window* scroll rather than an inner
 * container: every scroll-driven 3D effect in the app reads `window.scrollY`,
 * and nesting a scroller would break that. The sidebar is fixed and the topbar
 * sticky so the layout still looks like a conventional admin console.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const depth = useDepth()

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <ScrollProgressBar />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div
        className="flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-spring"
        style={{ paddingLeft: 'var(--shell-pad, 0px)' }}
      >
        {/* Drives the content offset from the sidebar width without a resize observer. */}
        <style>{`@media (min-width: 768px) { :root { --shell-pad: ${collapsed ? 76 : 232}px; } }`}</style>

        <Topbar />

        {/* Deliberately not a `.scene`: an ancestor `perspective` would become
            the containing block for any `position: fixed` descendant. Tilt3D
            and ScrollDepth each carry their own transformPerspective instead. */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 18, rotateX: depth ? 8 : 0, transformPerspective: 1400 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -10, rotateX: depth ? -4 : 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              // Deliberately NOT `preserve-3d`: this wrapper sits on top of
              // every page's own Tilt3D/ScrollDepth cards. An extra nested
              // preserve-3d context here — on top of the ones those already
              // establish — breaks native click/hit-testing for any button or
              // link further down the tree in Chromium, independent of the
              // actual transform values (confirmed empirically; see Card.tsx).
              // The route-transition rotateX still animates correctly without
              // it; the cost is that the outgoing/incoming page renders as a
              // flat plane during the ~0.35s transition, which is imperceptible.
              className="mx-auto w-full max-w-[1500px]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mx-auto w-full max-w-[1500px] px-4 pb-8 text-center text-[11px] text-muted-foreground/70 sm:px-6">
          Origin ERP · PS-6 · SIH 2025 · Team Origin
        </footer>
      </div>
    </div>
  )
}

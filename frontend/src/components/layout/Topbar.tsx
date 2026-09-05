import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion'
import { Bell, Boxes, ChevronRight, Search, Square, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/store/auth-context'
import { useUI } from '@/store/ui-context'
import { Kbd } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/risk-radar': 'Risk Radar',
  '/students': 'Students',
  '/attendance': 'Attendance',
  '/fees': 'Fees',
  '/results': 'Results',
  '/query': 'Query Assistant',
  '/reports': 'Reports',
}

const roleAccent: Record<string, string> = {
  ADMIN: 'text-primary',
  FACULTY: 'text-neon-cyan',
  STUDENT: 'text-[hsl(var(--risk-low))]',
}

const avatarBg: Record<string, string> = {
  ADMIN: 'bg-primary-sheen text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary))]',
  FACULTY: 'bg-neon-cyan text-[hsl(230_30%_8%)] shadow-[0_4px_12px_-4px_hsl(var(--neon-cyan))]',
  STUDENT: 'bg-[hsl(var(--risk-low))] text-[hsl(230_30%_8%)] shadow-[0_4px_12px_-4px_hsl(var(--risk-low))]',
}

export function Topbar() {
  const { user } = useAuth()
  const { theme, toggleTheme, depth, toggleDepth, reducedMotion } = useUI()
  const { pathname } = useLocation()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  // The bar gains its glass + elevation only once content slides under it.
  useEffect(() => scrollY.on('change', (v) => setScrolled(v > 8)), [scrollY])
  const blurPx = useTransform(scrollY, [0, 60], [0, 18])
  const barBlur = useMotionTemplate`blur(${blurPx}px) saturate(150%)`
  const barBg = useTransform(scrollY, [0, 60], ['hsl(var(--background) / 0)', 'hsl(var(--background) / 0.72)'])

  const title = PAGE_TITLES[pathname] ?? 'Overview'

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 px-4 transition-all duration-300 sm:px-6',
        scrolled && 'border-b border-border/70 shadow-elev-2',
      )}
      style={{
        backdropFilter: barBlur,
        WebkitBackdropFilter: barBlur,
        backgroundColor: barBg,
      }}
    >
      {/* ── Breadcrumb ── */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">{user?.department ?? 'All Departments'}</span>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/50 sm:inline" />
        <span className="truncate font-display font-semibold text-foreground">{title}</span>
      </div>

      {/* ── Controls ── */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* 3D / Normal switch — the headline control */}
        <div
          className="hidden items-center gap-2.5 rounded-2xl border border-border bg-surface/50 py-1.5 pl-3 pr-2 backdrop-blur-md lg:flex"
          title={reducedMotion ? 'Your system requests reduced motion — 3D is disabled' : undefined}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {depth ? <Boxes className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
            {depth ? '3D' : 'Flat'}
          </span>
          <Switch checked={depth} onChange={toggleDepth} label="Toggle 3D interface" />
        </div>

        {/* Theme switch */}
        <Switch
          checked={theme === 'dark'}
          onChange={toggleTheme}
          label="Toggle light and dark theme"
          icons={[<Moon key="m" className="h-3 w-3" />, <Sun key="s" className="h-3 w-3" />]}
        />

        {/* Search */}
        <button className="hidden items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground md:flex">
          <Search className="h-3.5 w-3.5" />
          Search…
          <Kbd>⌘K</Kbd>
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface/50 text-muted-foreground backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface/50 py-1.5 pl-1.5 pr-3 backdrop-blur-md">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
              user?.role ? avatarBg[user.role] : 'bg-muted text-muted-foreground',
            )}
          >
            {user?.name?.charAt(0) ?? '?'}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-semibold text-foreground">{user?.name ?? 'Guest'}</div>
            <div className={cn('text-[9px] font-bold uppercase tracking-[0.14em]', user?.role ? roleAccent[user.role] : 'text-muted-foreground')}>
              {user?.role ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

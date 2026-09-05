import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth-context'
import { useDepth } from '@/store/ui-context'
import type { Role } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: Role[]
  badge?: string
}

/** Must stay in sync with the route guards in AppRouter.tsx. */
const NAV: NavItem[] = [
  { to: '/',           label: 'Dashboard',      icon: LayoutDashboard, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/risk-radar', label: 'Risk Radar',     icon: ShieldAlert,     roles: ['ADMIN', 'FACULTY'] },
  { to: '/students',   label: 'Students',       icon: Users,           roles: ['ADMIN', 'FACULTY'] },
  { to: '/attendance', label: 'Attendance',     icon: CalendarCheck,   roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/fees',       label: 'Fees',           icon: Wallet,          roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/results',    label: 'Results',        icon: BarChart3,       roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/query',      label: 'Query Assistant', icon: MessageSquare,  roles: ['ADMIN', 'FACULTY'], badge: 'AI' },
  { to: '/reports',    label: 'Reports',        icon: FileText,        roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
]

/**
 * A standing glass panel rather than a flat rail. Nav items are slabs that push
 * toward the viewer on hover and lock forward when active, so "where am I" is
 * communicated by depth as well as colour.
 */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth()
  const depth = useDepth()
  const items = NAV.filter((item) => (user ? item.roles.includes(user.role) : false))

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 hidden shrink-0 flex-col md:flex',
        'transition-[width] duration-300 ease-spring',
        collapsed ? 'w-[76px]' : 'w-[232px]',
      )}
      style={{ perspective: depth ? '900px' : undefined }}
    >
      <div
        className={cn(
          'relative m-3 flex h-[calc(100%-1.5rem)] flex-col rounded-3xl',
          'panel panel-raised preserve-3d',
        )}
      >
        {/* Vertical light seam down the leading edge */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/35 to-transparent"
        />

        {/* ── Brand ── */}
        <div className={cn('flex h-16 shrink-0 items-center gap-3 px-4', collapsed && 'justify-center px-0')}>
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-sheen text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary)),inset_0_1px_0_rgb(255_255_255/0.35)]"
            style={depth ? { transform: 'translateZ(26px)' } : undefined}
          >
            <GraduationCap className="h-5 w-5" />
            <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
          </div>
          {!collapsed && (
            <div style={depth ? { transform: 'translateZ(18px)' } : undefined}>
              <div className="font-display text-[15px] font-bold leading-none tracking-tight">
                Origin <span className="text-primary text-glow">ERP</span>
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Student Intelligence
              </div>
            </div>
          )}
        </div>

        <div className="hairline mx-3 shrink-0" />

        {/* ── Nav ── */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4 preserve-3d">
          {items.map(({ to, label, icon: Icon, badge }, i) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'nav-slab group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold',
                  collapsed && 'justify-center px-0',
                  isActive ? 'nav-slab-active' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <motion.span
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className={cn('flex w-full items-center gap-3', collapsed && 'justify-center')}
                >
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0 transition-all duration-200',
                      isActive
                        ? 'text-primary drop-shadow-[0_0_6px_hsl(var(--primary))]'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && badge && (
                    <span
                      className={cn(
                        'ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                        badge === 'AI'
                          ? 'bg-neon-violet/18 text-neon-violet ring-1 ring-neon-violet/30'
                          : 'bg-[hsl(var(--risk-high))]/16 text-[hsl(var(--risk-high))] ring-1 ring-[hsl(var(--risk-high))]/30',
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer: user + collapse ── */}
        <div className="shrink-0 space-y-1 p-3 pt-0">
          <div className="hairline mb-3" />

          {!collapsed && user && (
            <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-border/70 bg-surface-sunken/40 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-sheen text-xs font-bold text-primary-foreground shadow-[0_4px_10px_-4px_hsl(var(--primary))]">
                {user.name?.charAt(0) ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{user.name}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{user.role}</div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-[hsl(var(--risk-high))]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft className={cn('h-4 w-4 shrink-0 transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </div>
    </aside>
  )
}

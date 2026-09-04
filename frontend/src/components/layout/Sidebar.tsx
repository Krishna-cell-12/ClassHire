import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth-context'
import type { Role } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: Role[]
}

/** Mirrors the server-side access matrix - keep the two in sync. */
const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/risk-radar', label: 'Risk Radar', icon: ShieldAlert, roles: ['ADMIN', 'FACULTY'] },
  { to: '/students', label: 'Students', icon: Users, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/fees', label: 'Fees', icon: Wallet, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/results', label: 'Results', icon: BarChart3, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/query', label: 'Query Assistant', icon: MessageSquare, roles: ['ADMIN', 'FACULTY'] },
  { to: '/reports', label: 'Reports', icon: FileText, roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
]

export function Sidebar() {
  const { user } = useAuth()
  const items = NAV.filter((item) => (user ? item.roles.includes(user.role) : false))

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:block">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <GraduationCap className="h-5 w-5" />
        <span className="font-semibold">Origin ERP</span>
      </div>
      <nav className="space-y-1 p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

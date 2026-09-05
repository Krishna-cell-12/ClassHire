import { Navigate, Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/store/auth-context'
import type { Role } from '@/types'

/**
 * Route guard. Convenience only - the real access control lives in the backend
 * (@PreAuthorize + JWT role claim). Never rely on this alone.
 */
export function ProtectedRoute({ allow }: { allow?: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative flex h-24 w-24 items-center justify-center" style={{ perspective: '600px' }}>
          {/* Two counter-rotating rings around the mark */}
          <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-transparent border-t-primary border-r-primary/40" />
          <span
            className="absolute inset-3 animate-spin-slow rounded-full border-2 border-transparent border-b-neon-cyan/70"
            style={{ animationDirection: 'reverse', animationDuration: '9s' }}
          />
          <span className="flex h-11 w-11 animate-float items-center justify-center rounded-2xl bg-primary-sheen text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary))]">
            <GraduationCap className="h-5 w-5" />
          </span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}

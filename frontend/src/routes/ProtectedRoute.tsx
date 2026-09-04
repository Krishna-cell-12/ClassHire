import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/store/auth-context'
import type { Role } from '@/types'

/**
 * Route guard. Convenience only - the real access control lives in the backend
 * (@PreAuthorize + JWT role claim). Never rely on this alone.
 */
export function ProtectedRoute({ allow }: { allow?: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}

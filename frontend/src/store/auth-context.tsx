import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiErrorMessage, TOKEN_KEY } from '@/lib/api'
import { authApi } from '@/lib/endpoints'
import type { CurrentUser, MeResponse, Role } from '@/types'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

export { TOKEN_KEY }

/**
 * Flattens `GET /api/auth/me` into what the UI needs.
 *
 * Note `studentId`/`facultyId`: several endpoints are keyed by the *profile* id,
 * not the User id, and the two are different UUIDs. Resolving them once here is
 * what lets a student page fetch their own attendance and fees.
 */
function toCurrentUser(me: MeResponse): CurrentUser {
  const profile = me.student ?? me.faculty
  const name = profile ? `${profile.firstName} ${profile.lastName}` : 'Administrator'

  return {
    id: me.id,
    email: me.email,
    role: me.role,
    name,
    department: profile?.department?.code,
    departmentId: profile?.departmentId,
    studentId: me.student?.id,
    facultyId: me.faculty?.id,
  }
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On boot, trade any stored token for the current user. A token that the
  // server rejects (expired, or from an older seed) is discarded here rather
  // than left to fail on the first page fetch.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(toCurrentUser(me))
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { token } = await authApi.login(email, password)
      localStorage.setItem(TOKEN_KEY, token)

      // Fetch the full profile before flipping to signed-in, so the first
      // render after login already has the name/department/profile ids.
      const me = await authApi.me()
      setUser(toCurrentUser(me))
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY)
      throw new Error(apiErrorMessage(err, 'Invalid email or password'))
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    window.location.href = '/login'
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      logout,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

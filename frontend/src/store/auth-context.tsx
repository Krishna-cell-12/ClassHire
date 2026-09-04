import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, TOKEN_KEY } from '@/lib/api'
import type { CurrentUser, Role } from '@/types'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on reload; the token alone is not trusted for identity.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false)
      return
    }
    api
      .get<CurrentUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const res = await api.post<{ token: string; user: CurrentUser }>('/auth/login', {
          email,
          password,
        })
        localStorage.setItem(TOKEN_KEY, res.data.token)
        setUser(res.data.user)
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      },
      hasRole(...roles) {
        return user ? roles.includes(user.role) : false
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

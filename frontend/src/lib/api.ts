import axios from 'axios'

export const TOKEN_KEY = 'erp.token'

/**
 * Baseline axios client. In dev, requests go to /api and the Vite dev server
 * proxies them to the Express API (see vite.config.ts). In a deployed build,
 * set VITE_API_BASE_URL to the API's absolute URL.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Expired/invalid token: drop it and bounce to login. The login request
    // itself is exempt — a wrong password there is a message to show the user,
    // not a session expiry, and reloading would throw away that message.
    const isLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Pulls a human-readable message out of whatever the API returned.
 *
 * The error handler emits `{ error: { message, code } }`, but the NL-search 422
 * uses `{ error: string }` instead, and a proxy or a dead server produces
 * neither — so all three shapes are handled here rather than at each call site.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } | string } | undefined
    const payload = data?.error
    if (typeof payload === 'string') return payload
    if (payload?.message) {
      // Validation failures arrive as a JSON-stringified Zod fieldErrors map.
      try {
        const fields = JSON.parse(payload.message) as Record<string, string[]>
        const parts = Object.entries(fields).map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        if (parts.length) return parts.join(' · ')
      } catch {
        /* not JSON — use it as-is */
      }
      return payload.message
    }
    if (!err.response) return 'Cannot reach the server. Is the API running on port 4000?'
    return err.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

/**
 * Downloads a report endpoint to a file.
 *
 * Report routes are authenticated, so a plain <a href> or window.open can't be
 * used — the browser wouldn't attach the bearer token. Fetch as a blob through
 * the axios instance, then click a temporary object-URL link.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' })

  // Prefer the server's filename when it sent one.
  const disposition = res.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"']+)"?/)
  const filename = match?.[1] ?? fallbackName

  const objectUrl = URL.createObjectURL(res.data as Blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiErrorMessage } from '@/lib/api'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Runs an async fetch and tracks loading/error state.
 *
 * `fn` is held in a ref and deliberately kept out of the dependency array: it is
 * an inline arrow at nearly every call site, so a new identity every render
 * would re-fetch forever. Pass the values it closes over in `deps` instead.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    // Guards against a slow first response overwriting a newer one after the
    // deps change (e.g. typing in a search box).
    let cancelled = false
    setLoading(true)
    setError(null)

    fnRef
      .current()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(apiErrorMessage(err))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, refetch }
}

/**
 * Debounces a fast-changing value (search boxes) so it can be used as a `useApi`
 * dependency without firing a request per keystroke.
 */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

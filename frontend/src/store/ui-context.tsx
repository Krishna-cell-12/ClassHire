import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'dark' | 'light'

interface UIState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  /** User's 3D preference (what the switch shows). */
  depth: boolean
  toggleDepth: () => void
  /** 3D actually applied right now — false if the OS asks for reduced motion. */
  depthActive: boolean
  reducedMotion: boolean
}

const THEME_KEY = 'origin.theme'
const DEPTH_KEY = 'origin.depth'

const UIContext = createContext<UIState | undefined>(undefined)

function readTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.dataset.theme
    if (attr === 'light' || attr === 'dark') return attr
  }
  return 'dark'
}

function readDepth(): boolean {
  try {
    return localStorage.getItem(DEPTH_KEY) !== 'off'
  } catch {
    return true
  }
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [depth, setDepth] = useState<boolean>(readDepth)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const depthActive = depth && !reducedMotion

  // Both switches are expressed as attributes on <html>, so plain CSS can react
  // to them (see --tilt-max / --lift in index.css) without any re-render.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0b12' : '#f1f4f9')
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* private mode */ }
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.depth = depthActive ? 'on' : 'off'
    try { localStorage.setItem(DEPTH_KEY, depth ? 'on' : 'off') } catch { /* private mode */ }
  }, [depth, depthActive])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const toggleDepth = useCallback(() => setDepth((d) => !d), [])

  const value = useMemo<UIState>(
    () => ({ theme, setTheme, toggleTheme, depth, toggleDepth, depthActive, reducedMotion }),
    [theme, setTheme, toggleTheme, depth, toggleDepth, depthActive, reducedMotion],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within a UIProvider')
  return ctx
}

/** Convenience for components that only care whether 3D is on. */
export function useDepth() {
  return useUI().depthActive
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  ShieldAlert,
  Sun,
  Wallet,
  CalendarCheck,
} from 'lucide-react'
import { useAuth } from '@/store/auth-context'
import { useUI } from '@/store/ui-context'
import { Backdrop } from '@/components/three-d/Backdrop'
import { Tilt3D, Layer } from '@/components/three-d/Tilt3D'
import { Switch } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

/**
 * Real accounts created by `npm run seed` (server/prisma/seed.ts). The seed runs
 * with a fixed faker seed, so these addresses are stable across re-seeds.
 *
 * The student is the seed's designated high-risk demo account — signing in as
 * them shows the eligibility and fee warnings actually firing, rather than a
 * healthy account where every panel reads green.
 */
const DEMO_PASSWORD = 'Password123!'

const DEMO_ACCOUNTS = [
  { label: 'Admin',   email: 'admin@college.edu',                accent: 'hsl(var(--primary))' },
  { label: 'Faculty', email: 'wyman.donnelly@college.edu',       accent: 'hsl(var(--neon-cyan))' },
  { label: 'Student', email: 'nia.schamberger49@college.edu',    accent: 'hsl(var(--risk-low))' },
]

const FEATURES = [
  { label: 'Student Risk Radar',   desc: 'Composite early-warning score', icon: ShieldAlert,    z: 70, color: 'hsl(var(--risk-high))' },
  { label: 'NL Query Assistant',   desc: 'Ask your data in plain English', icon: MessageSquare, z: 44, color: 'hsl(var(--neon-violet))' },
  { label: 'Real-time Attendance', desc: 'Eligibility flags as you mark',  icon: CalendarCheck, z: 22, color: 'hsl(var(--neon-cyan))' },
  { label: 'Fee Tracking',         desc: 'Overdue accounts, dept rollups', icon: Wallet,        z: 4,  color: 'hsl(var(--primary))' },
  { label: 'Smart Reports',        desc: 'Narrative summaries, PII-safe',  icon: BarChart3,     z: -16, color: 'hsl(var(--risk-low))' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const { theme, toggleTheme, depth, toggleDepth, depthActive } = useUI()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Whole-page pointer parallax for the hero stack.
  const stageRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 60, damping: 22 })
  const sy = useSpring(my, { stiffness: 60, damping: 22 })
  const heroRotateY = useTransform(sx, [0, 1], [14, -14])
  const heroRotateX = useTransform(sy, [0, 1], [-10, 10])

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      mx.set(e.clientX / window.innerWidth)
      my.set(e.clientY / window.innerHeight)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // The `user` effect below also catches this, but navigating here means
      // the redirect doesn't wait on a second render pass.
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={stageRef} className="relative flex min-h-screen items-center overflow-hidden">
      <Backdrop />

      {/* Floating controls */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-3">
        <div className="hidden items-center gap-2.5 rounded-2xl border border-border bg-surface/50 py-1.5 pl-3 pr-2 backdrop-blur-md sm:flex">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Boxes className={cn('h-3.5 w-3.5', depth && 'text-primary')} />
            {depth ? '3D' : 'Flat'}
          </span>
          <Switch checked={depth} onChange={toggleDepth} label="Toggle 3D interface" />
        </div>
        <Switch
          checked={theme === 'light'}
          onChange={toggleTheme}
          label="Toggle light and dark theme"
          icons={[<Moon key="m" className="h-3 w-3" />, <Sun key="s" className="h-3 w-3" />]}
        />
      </div>

      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-14 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16">
        {/* ══════════ Hero stack ══════════ */}
        <div className="hidden lg:block" style={{ perspective: depthActive ? '1400px' : undefined }}>
          <motion.div
            className="preserve-3d"
            style={depthActive ? { rotateX: heroRotateX, rotateY: heroRotateY } : undefined}
          >
            {/* Mark */}
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 30 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="preserve-3d"
              style={depthActive ? { transform: 'translateZ(90px)' } : undefined}
            >
              <div className="relative mb-7 inline-flex h-[72px] w-[72px] items-center justify-center">
                <span className="absolute inset-0 animate-spin-slow rounded-[26px] border border-primary/30" />
                <span
                  className="absolute -inset-3 animate-spin-slow rounded-full border border-dashed border-primary/20"
                  style={{ animationDirection: 'reverse', animationDuration: '22s' }}
                />
                <span className="flex h-[72px] w-[72px] animate-float items-center justify-center rounded-[26px] bg-primary-sheen text-primary-foreground shadow-[0_20px_50px_-16px_hsl(var(--primary)),inset_0_2px_0_rgb(255_255_255/0.35)]">
                  <GraduationCap className="h-9 w-9" />
                </span>
              </div>

              <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight">
                Origin <span className="bg-gradient-to-br from-primary to-[hsl(18_92%_48%)] bg-clip-text text-transparent">ERP</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                One console for attendance, fees, results and risk — with an early-warning radar that tells you
                <span className="text-foreground"> which student needs help, and why</span>, before the semester ends.
              </p>
            </motion.div>

            {/* Feature slabs at staggered depths */}
            <div className="mt-10 space-y-2.5 preserve-3d">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -50, rotateY: 22 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    transition={{ delay: 0.35 + i * 0.09, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="preserve-3d"
                    style={depthActive ? { transform: `translateZ(${f.z}px)` } : undefined}
                  >
                    <div className="panel group flex max-w-md items-center gap-3.5 px-4 py-3 transition-transform duration-300 hover:translate-x-1.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-raised/60"
                        style={{ color: f.color, boxShadow: `0 0 18px -8px ${f.color}` }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                      </div>
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: f.color, boxShadow: `0 0 10px ${f.color}` }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70"
            >
              PS-6 · SIH 2025 · Team Origin
            </motion.p>
          </motion.div>
        </div>

        {/* ══════════ Login card ══════════ */}
        <div style={{ perspective: depthActive ? '1200px' : undefined }}>
          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: depthActive ? 22 : 0 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="preserve-3d"
          >
            <Tilt3D max={6} lift={18}>
              <div className="panel panel-raised p-7" style={{ ['--accent' as any]: 'hsl(var(--primary))' }}>
                <Layer z={0}>
                  {/* Mobile mark */}
                  <div className="mb-6 flex flex-col items-center lg:hidden">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-sheen text-primary-foreground shadow-[0_10px_28px_-10px_hsl(var(--primary))]">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <h1 className="mt-3 font-display text-2xl font-bold">
                      Origin <span className="text-primary">ERP</span>
                    </h1>
                  </div>

                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary" />
                      Secure sign-in
                    </span>
                    <h2 className="mt-3 font-display text-2xl font-bold">Welcome back</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@origin.edu"
                        autoComplete="email"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={cn(inputClass, 'pr-10', error && 'border-[hsl(var(--risk-high))]/60')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                        transition={{ duration: 0.4 }}
                        className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--risk-high))]"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> {error}
                      </motion.p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={cn(
                        'group/btn relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3',
                        'bg-primary-sheen text-sm font-bold text-primary-foreground',
                        'shadow-[0_1px_0_hsl(var(--primary)/0.9)_inset,0_-2px_0_hsl(18_92%_38%)_inset,0_10px_26px_-10px_hsl(var(--primary))]',
                        'transition-all hover:brightness-110 active:translate-y-px disabled:opacity-60',
                      )}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-white/25 opacity-0 group-hover/btn:animate-sweep group-hover/btn:opacity-100"
                      />
                      {loading ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <>
                          <span className="relative z-10">Sign In</span>
                          <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Demo accounts */}
                  <div className="mt-7">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="hairline flex-1" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Demo Accounts
                      </span>
                      <div className="hairline flex-1" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {DEMO_ACCOUNTS.map((acc, i) => (
                        <motion.button
                          key={acc.label}
                          type="button"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                          whileHover={depthActive ? { y: -4, scale: 1.03 } : { scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setEmail(acc.email)
                            setPassword(DEMO_PASSWORD)
                            setError('')
                          }}
                          className="rounded-xl border border-border bg-surface-sunken/50 px-2.5 py-2.5 text-left transition-colors hover:border-primary/40"
                          style={{ boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.05)` }}
                        >
                          <span
                            className="mb-1 block h-1 w-6 rounded-full"
                            style={{ background: acc.accent, boxShadow: `0 0 8px ${acc.accent}` }}
                          />
                          <div className="text-xs font-bold" style={{ color: acc.accent }}>
                            {acc.label}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">{acc.email.split('@')[0]}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </Layer>
              </div>
            </Tilt3D>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-surface-sunken/70 py-3 pl-10 pr-4 text-sm text-foreground backdrop-blur-md ' +
  'shadow-[inset_0_2px_4px_rgb(0_0_0/0.35)] placeholder:text-muted-foreground/55 transition-all ' +
  'focus:border-primary/60 focus:outline-none focus:shadow-[inset_0_2px_4px_rgb(0_0_0/0.35),0_0_0_3px_hsl(var(--primary)/0.16),0_0_22px_-8px_hsl(var(--primary))]'

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  )
}

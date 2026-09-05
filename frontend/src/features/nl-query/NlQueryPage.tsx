import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Loader2, MessageSquare, Search, Send, Sparkles } from 'lucide-react'
import { SectionHeading } from '@/components/ui/Shared'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ScrollDepth } from '@/components/three-d/ScrollDepth'
import { useDepth } from '@/store/ui-context'
import { studentsApi } from '@/lib/endpoints'
import { apiErrorMessage } from '@/lib/api'
import { attendanceColor, cn, FEE_BADGE } from '@/lib/utils'
import type { NlSearchRow, NlStudentFilter } from '@/types'

type Message = {
  role: 'user' | 'assistant'
  text: string
  results?: NlSearchRow[]
  /** The whitelisted filter the model produced, shown so the parse is auditable. */
  filter?: NlStudentFilter
  total?: number
  isError?: boolean
}

const SUGGESTIONS = [
  'Show CSE students with attendance below 75%',
  'Which students have overdue fees in ECE?',
  'List high-risk students in semester 5',
  'Students in Mechanical with attendance above 90%',
  'Show IT students from batch 2023 with partial fees',
]

/** `{ department: 'CSE', attendanceBelow: 75 }` → `department=CSE, attendanceBelow=75` */
function describeFilter(filter: NlStudentFilter): string {
  return Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
}

export function NlQueryPage() {
  const depth = useDepth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi! I can query the student database in plain English. Try "Show CSE students with attendance below 75%". Your question is parsed into a fixed, whitelisted filter — the model never writes SQL.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(q = input.trim()) {
    if (!q || loading) return
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const res = await studentsApi.searchNl(q)
      const count = res.meta.total
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            count === 0
              ? 'No students matched that filter. The query parsed fine — there just aren’t any matching records.'
              : `Found **${count} student${count === 1 ? '' : 's'}**${
                  count > res.data.length ? `, showing the first ${res.data.length}` : ''
                }.`,
          results: res.data,
          filter: res.filter,
          total: count,
        },
      ])
    } catch (err) {
      // A 422 means the model couldn't map the question onto the allowed filter
      // fields — that's a rephrase prompt, not a crash.
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: apiErrorMessage(err, 'Could not run that query.'), isError: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionHeading
        eyebrow="AI assistant"
        title="Natural Language Query"
        icon={<Sparkles className="h-5 w-5" />}
        subtitle="Ask questions about student data in plain English — no filters to click through."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ══════════ Conversation ══════════ */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ScrollDepth>
            <div className="panel panel-raised relative overflow-hidden">
              {/* Ambient AI glow along the top edge */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--neon-violet)), transparent)' }}
              />
              <div
                ref={scrollRef}
                className="flex max-h-[540px] min-h-[440px] flex-col gap-4 overflow-y-auto p-5"
                style={{ perspective: depth ? '1200px' : undefined }}
              >
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 18, rotateX: depth ? 12 : 0 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className={cn('flex gap-3 preserve-3d', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {msg.role === 'assistant' && (
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1',
                            msg.isError
                              ? 'bg-[hsl(var(--risk-high))]/16 text-[hsl(var(--risk-high))] ring-[hsl(var(--risk-high))]/25'
                              : 'bg-neon-violet/16 text-neon-violet shadow-[0_0_16px_-6px_hsl(var(--neon-violet))] ring-neon-violet/25',
                          )}
                        >
                          <Sparkles className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                          msg.role === 'user' ? 'bubble-user rounded-tr-md' : 'bubble-bot rounded-tl-md',
                          msg.isError && 'text-[hsl(var(--risk-high))]',
                        )}
                      >
                        {msg.text.split('**').map((part, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="font-display text-primary">
                              {part}
                            </strong>
                          ) : (
                            <span key={j}>{part}</span>
                          ),
                        )}

                        {msg.filter && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-surface-sunken/60 px-3 py-1.5 text-[11px] text-muted-foreground">
                            <Search className="h-3 w-3 shrink-0 text-primary" />
                            <code className="truncate">{describeFilter(msg.filter)}</code>
                          </div>
                        )}

                        {msg.results && msg.results.length > 0 && (
                          <div className="mt-3">
                            <Table>
                              <Thead>
                                <Tr>
                                  <Th>Name</Th>
                                  <Th>Dept</Th>
                                  <Th>Att.</Th>
                                  <Th>Fee</Th>
                                  <Th>Risk</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {msg.results.slice(0, 25).map((r, k) => (
                                  <Tr key={r.id} index={k}>
                                    <Td>
                                      <div className="text-xs font-semibold">
                                        {r.firstName} {r.lastName}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">{r.rollNumber}</div>
                                    </Td>
                                    <Td className="whitespace-nowrap text-[11px] text-muted-foreground">
                                      {r.department?.code ?? '—'} · S{r.currentSemester}
                                    </Td>
                                    <Td>
                                      <span
                                        className="text-xs font-bold tabular-nums"
                                        style={{ color: attendanceColor(r.attendancePct) }}
                                      >
                                        {r.attendancePct === null ? '—' : `${r.attendancePct}%`}
                                      </span>
                                    </Td>
                                    <Td>
                                      {r.feeStatus ? (
                                        <Badge variant={FEE_BADGE[r.feeStatus] ?? 'default'}>{r.feeStatus}</Badge>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">—</span>
                                      )}
                                    </Td>
                                    <Td>
                                      <Badge variant={r.riskLevel.toLowerCase() as any}>
                                        {r.riskLevel} {r.riskScore}
                                      </Badge>
                                    </Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                            {msg.results.length > 25 && (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                Showing 25 of {msg.results.length} returned rows.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-sheen text-xs font-bold text-primary-foreground shadow-[0_4px_12px_-5px_hsl(var(--primary))]">
                          U
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neon-violet/16 text-neon-violet ring-1 ring-neon-violet/25">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <span className="text-sm text-muted-foreground">Parsing your question into a safe filter…</span>
                  </motion.div>
                )}
              </div>
            </div>
          </ScrollDepth>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <MessageSquare className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(
                  'w-full rounded-xl border border-border bg-surface-sunken/70 py-3 pl-10 pr-4 text-sm text-foreground backdrop-blur-md',
                  'shadow-[inset_0_2px_4px_rgb(0_0_0/0.35)] placeholder:text-muted-foreground/55 transition-all',
                  'focus:border-primary/60 focus:outline-none focus:shadow-[inset_0_2px_4px_rgb(0_0_0/0.35),0_0_0_3px_hsl(var(--primary)/0.16),0_0_22px_-8px_hsl(var(--primary))]',
                )}
                placeholder="e.g. Show CSE students with attendance below 75%…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* ══════════ Sidebar ══════════ */}
        <div className="space-y-4">
          <ScrollDepth index={1}>
            <Card elevation={3}>
              <CardHeader>
                <div>
                  <CardTitle>Suggested Queries</CardTitle>
                  <CardSubtitle>Tap one to run it</CardSubtitle>
                </div>
              </CardHeader>
              <div className="space-y-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, x: 14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    whileHover={depth ? { x: 4 } : undefined}
                    onClick={() => handleSend(s)}
                    disabled={loading}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-sunken/40 px-3.5 py-2.5 text-left text-[13px] text-muted-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] transition-colors hover:border-primary/35 hover:text-foreground disabled:opacity-50"
                  >
                    <span>{s}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                  </motion.button>
                ))}
              </div>
            </Card>
          </ScrollDepth>

          <ScrollDepth index={2}>
            <Card elevation={3}>
              <CardHeader>
                <div>
                  <CardTitle>How It Works</CardTitle>
                  <CardSubtitle>Parameterised, never raw SQL</CardSubtitle>
                </div>
              </CardHeader>
              <ol className="space-y-3.5">
                {[
                  'Your question goes to the LLM, which may only reply with a fixed JSON filter — department, semester, attendance threshold, fee status, risk level, batch, name.',
                  'That JSON is validated against a strict whitelist. Any unrecognised field rejects the whole query, so a prompt injection has nothing to land on.',
                  'The validated filter drives a parameterised Prisma query. Nothing the model produces is ever interpolated into SQL.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/14 font-display text-[10px] font-bold text-primary ring-1 ring-primary/25">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          </ScrollDepth>
        </div>
      </div>
    </div>
  )
}

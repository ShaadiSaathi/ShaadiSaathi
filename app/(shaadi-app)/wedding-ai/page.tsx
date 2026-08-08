"use client"

/**
 * Premium wedding AI chat UI — Markdown rendering + conversational layout
 * with persisted past Q&A for the signed-in family's wedding.
 */

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { getFirebaseAuth } from "@/lib/firebase/config"

type Citation = { url: string; title: string }

type RetrievedMeta = {
  id: string
  score: number
  chunkType: string
  anecdotal: boolean
  region: string
}

type ChatTurn =
  | { id: string; role: "user"; content: string }
  | {
      id: string
      role: "assistant"
      content: string
      citations: Citation[]
      retrieved: RetrievedMeta[]
    }

type HistoryItem = {
  id: string
  question: string
  answer: string
  citations: Citation[]
  createdAt: number
}

const markdownComponents = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-6 mb-2 font-sans text-[1.35rem] font-semibold tracking-tight text-maroon-dark first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-5 mb-1.5 font-sans text-[1.1rem] font-semibold tracking-tight text-maroon-dark">
      {children}
    </h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-3 font-sans text-[15px] leading-[1.7] text-maroon-dark/90 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-maroon">{children}</strong>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 font-sans text-[15px] leading-[1.7] text-maroon-dark/90">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 font-sans text-[15px] leading-[1.7] text-maroon-dark/90">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="marker:text-gold-dark">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-maroon underline decoration-gold/50 underline-offset-2 hover:decoration-maroon"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-gold/40 pl-3 font-sans text-[15px] leading-[1.7] text-maroon/70 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-0 border-t border-maroon/10" />,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse font-sans text-sm text-maroon-dark/90">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border-b border-maroon/15 px-2 py-1.5 text-left font-semibold text-maroon-dark">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border-b border-maroon/8 px-2 py-1.5 align-top">{children}</td>
  ),
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="wedding-ai-prose font-sans">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

function formatHistoryWhen(createdAt: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(createdAt))
  } catch {
    return ""
  }
}

export default function WeddingAiTestPage() {
  const { firebaseUser, isFamilyLoggedIn, authLoading } = useAuth()
  const { isFamilyPremium } = usePremium()
  const [draft, setDraft] = useState(
    "What colours and decor work well for a Pakistani mehndi?"
  )
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyNextCursor, setHistoryNextCursor] = useState<number | null>(
    null
  )
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [historyOpen, setHistoryOpen] = useState(true)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  )

  const loadHistory = useCallback(async (opts?: { append?: boolean; cursor?: number | null }) => {
    const fbUser = getFirebaseAuth().currentUser
    if (!fbUser) return

    setHistoryLoading(true)
    setHistoryError("")
    try {
      const token = await fbUser.getIdToken()
      const params = new URLSearchParams({ limit: "20" })
      if (opts?.append && opts.cursor != null) {
        params.set("cursor", String(opts.cursor))
      }
      const res = await fetch(`/api/wedding-chat/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await res.json()) as {
        error?: string
        items?: HistoryItem[]
        nextCursor?: number | null
      }
      if (!res.ok) {
        setHistoryError(data.error || `Could not load history (${res.status})`)
        return
      }
      const items = data.items || []
      setHistory((prev) => {
        if (!opts?.append) return items
        const seen = new Set(prev.map((h) => h.id))
        return [...prev, ...items.filter((h) => !seen.has(h.id))]
      })
      setHistoryNextCursor(
        typeof data.nextCursor === "number" ? data.nextCursor : null
      )
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Could not load history"
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isFamilyLoggedIn || !firebaseUser || !isFamilyPremium) return
    void loadHistory()
  }, [isFamilyLoggedIn, firebaseUser, isFamilyPremium, loadHistory])

  function showHistoryItem(item: HistoryItem) {
    setSelectedHistoryId(item.id)
    setError("")
    setTurns([
      { id: `hist-u-${item.id}`, role: "user", content: item.question },
      {
        id: `hist-a-${item.id}`,
        role: "assistant",
        content: item.answer,
        citations: item.citations || [],
        retrieved: [],
      },
    ])
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  async function ask(e?: FormEvent) {
    e?.preventDefault()
    const question = draft.trim()
    if (!question || busy) return

    setBusy(true)
    setError("")
    setSelectedHistoryId(null)
    const userTurnId = `u-${Date.now()}`
    setTurns((prev) => [...prev, { id: userTurnId, role: "user", content: question }])

    try {
      const fbUser = getFirebaseAuth().currentUser
      if (!fbUser) {
        setError("Sign in first.")
        return
      }
      const token = await fbUser.getIdToken()
      const res = await fetch("/api/wedding-chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: question }),
      })
      const data = (await res.json()) as {
        error?: string
        reply?: string
        citations?: Citation[]
        retrieved?: RetrievedMeta[]
        config?: Record<string, unknown>
        historyId?: string | null
        historySaved?: boolean
      }
      if (!res.ok) {
        const detail =
          typeof data.config === "object" && data.config
            ? ` | config=${JSON.stringify(data.config)}`
            : ""
        setError((data.error || `Request failed (${res.status})`) + detail)
        return
      }
      const reply = data.reply || ""
      const citations = data.citations || []
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          citations,
          retrieved: data.retrieved || [],
        },
      ])
      setDraft("")

      if (data.historySaved && data.historyId) {
        const entry: HistoryItem = {
          id: data.historyId,
          question,
          answer: reply,
          citations,
          createdAt: Date.now(),
        }
        setHistory((prev) => [entry, ...prev.filter((h) => h.id !== entry.id)])
        setSelectedHistoryId(entry.id)
      } else if (data.historySaved === false) {
        console.warn("[wedding-ai] answer returned but history was not saved")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4">
        <p className="font-sans text-sm text-maroon/50">Loading…</p>
      </main>
    )
  }

  if (!isFamilyLoggedIn) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-gold-dark">
          Shaadi Saathi
        </p>
        <h1 className="mt-3 font-display text-3xl text-maroon-dark">Wedding AI</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-maroon/65">
          Sign in to ask about ceremonies, colours, and decor — grounded in our
          South Asian wedding knowledge base.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex rounded-full bg-maroon px-6 py-2.5 font-sans text-sm font-medium text-ivory shadow-sm transition hover:bg-maroon-dark"
        >
          Log in
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
      <header className="shrink-0 border-b border-maroon/8 pb-5">
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-gold-dark">
          Shaadi Saathi · Premium
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold text-maroon-dark sm:text-3xl">
          Wedding AI
        </h1>
        <p className="mt-1.5 max-w-xl font-sans text-sm leading-relaxed text-maroon/55">
          Ask about South Asian ceremonies, colour palettes, and decor. Answers
          stay grounded in our knowledge base.
          {!isFamilyPremium && (
            <>
              {" "}
              <Link
                href="/upgrade?feature=wedding-ai"
                className="font-medium text-maroon underline decoration-gold/40 underline-offset-2"
              >
                Upgrade required
              </Link>
            </>
          )}
        </p>
        {!firebaseUser && (
          <p className="mt-3 rounded-2xl bg-amber-50/90 px-4 py-3 font-sans text-sm text-amber-950/80 shadow-sm shadow-amber-900/5">
            This session has no Firebase auth token (e.g. tester mode). The API
            needs a real Firebase sign-in to verify premium.
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-6 py-6">
        {turns.length === 0 && !busy && (
          <div className="rounded-3xl bg-white/60 px-5 py-8 text-center shadow-sm shadow-maroon/5 ring-1 ring-maroon/5">
            <p className="font-sans text-sm leading-relaxed text-maroon/55">
              Try asking about Mehndi colours, Barat décor, or Walima palettes.
            </p>
            <button
              type="button"
              className="mt-4 font-sans text-sm font-medium text-maroon underline decoration-gold/50 underline-offset-2"
              onClick={() =>
                setDraft("What colours and decor work well for a Pakistani mehndi?")
              }
            >
              Use a starter question
            </button>
          </div>
        )}

        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-maroon px-4 py-3 font-sans text-[15px] leading-[1.65] text-ivory shadow-md shadow-maroon/15 sm:max-w-[75%]">
                {turn.content}
              </div>
            </div>
          ) : (
            <article key={turn.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-maroon/15 font-display text-xs font-semibold text-maroon-dark">
                  AI
                </span>
                <span className="font-sans text-xs font-medium uppercase tracking-wider text-maroon/40">
                  Assistant
                </span>
              </div>
              <AssistantMarkdown content={turn.content} />
              {turn.citations.length > 0 && (
                <footer className="border-t border-maroon/8 pt-3">
                  <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-maroon/35">
                    Learn more
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {turn.citations.map((c) => (
                      <li key={c.url}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-xs text-maroon/50 underline decoration-maroon/20 underline-offset-2 transition hover:text-maroon"
                        >
                          {c.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </footer>
              )}
              {turn.retrieved.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer list-none font-sans text-[11px] text-maroon/30 transition hover:text-maroon/50">
                    Retrieved sources (debug)
                  </summary>
                  <ul className="mt-2 space-y-0.5 font-mono text-[10px] leading-relaxed text-maroon/40">
                    {turn.retrieved.map((r) => (
                      <li key={r.id}>
                        {r.score.toFixed(3)} · {r.chunkType}
                        {r.anecdotal ? " · anecdotal" : ""} · {r.region}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          )
        )}

        {busy && (
          <div className="flex items-center gap-3 text-maroon/45">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold [animation-delay:300ms]" />
            </span>
            <span className="font-sans text-sm">Thinking…</span>
          </div>
        )}

        {error && (
          <p className="rounded-2xl bg-red-50/90 px-4 py-3 font-sans text-sm leading-relaxed text-red-900/80 shadow-sm">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => void ask(e)}
        className="sticky bottom-0 shrink-0 border-t border-maroon/8 bg-gradient-to-t from-ivory via-ivory to-ivory/80 pt-4 pb-1 backdrop-blur-sm"
      >
        <div className="rounded-3xl bg-white/90 p-2 shadow-lg shadow-maroon/8 ring-1 ring-maroon/8">
          <textarea
            className="max-h-40 min-h-[72px] w-full resize-none bg-transparent px-3 py-2.5 font-sans text-[15px] leading-[1.6] text-maroon-dark outline-none placeholder:text-maroon/35"
            rows={2}
            value={draft}
            placeholder="Ask about colours, ceremonies, décor…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void ask()
              }
            }}
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <p className="font-sans text-[11px] text-maroon/35">
              Enter to send · Shift+Enter for new line
            </p>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-full bg-maroon px-5 py-2 font-sans text-sm font-medium text-ivory shadow-sm transition hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </form>

      {isFamilyPremium && firebaseUser && (
        <section className="mt-6 border-t border-maroon/8 pt-5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            <span className="font-sans text-sm font-semibold text-maroon-dark">
              Past questions
              {history.length > 0 ? (
                <span className="ml-2 font-normal text-maroon/40">
                  ({history.length}
                  {historyNextCursor != null ? "+" : ""})
                </span>
              ) : null}
            </span>
            <span className="font-sans text-xs text-maroon/40">
              {historyOpen ? "Hide" : "Show"}
            </span>
          </button>

          {historyOpen && (
            <div className="mt-3 space-y-2">
              {historyLoading && history.length === 0 && (
                <p className="font-sans text-sm text-maroon/45">Loading history…</p>
              )}
              {historyError && (
                <p className="rounded-2xl bg-amber-50/90 px-3 py-2 font-sans text-sm text-amber-950/80">
                  {historyError}
                </p>
              )}
              {!historyLoading && !historyError && history.length === 0 && (
                <p className="font-sans text-sm text-maroon/45">
                  No past questions yet. Ask something above and it will show up
                  here after you reload.
                </p>
              )}
              <ul className="space-y-1.5">
                {history.map((item) => {
                  const active = selectedHistoryId === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => showHistoryItem(item)}
                        className={`w-full rounded-2xl px-3.5 py-2.5 text-left transition ring-1 ${
                          active
                            ? "bg-maroon/5 ring-maroon/20"
                            : "bg-white/50 ring-maroon/8 hover:bg-white/80 hover:ring-maroon/15"
                        }`}
                      >
                        <p className="line-clamp-2 font-sans text-sm leading-snug text-maroon-dark">
                          {item.question}
                        </p>
                        <p className="mt-1 font-sans text-[11px] text-maroon/40">
                          {formatHistoryWhen(item.createdAt)}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {historyNextCursor != null && (
                <button
                  type="button"
                  disabled={historyLoading}
                  onClick={() =>
                    void loadHistory({
                      append: true,
                      cursor: historyNextCursor,
                    })
                  }
                  className="mt-1 font-sans text-sm font-medium text-maroon underline decoration-gold/40 underline-offset-2 disabled:opacity-45"
                >
                  {historyLoading ? "Loading…" : "Load older questions"}
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

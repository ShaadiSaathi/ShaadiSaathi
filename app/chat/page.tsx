"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppShell } from "@/components/sidebar"
import { getScanHistory, getUserProfile } from "@/utils/storage"

type Message = {
  role: "user" | "assistant"
  content: string
  error?: boolean
}

const WELCOME =
  "Hey! I'm Max, your AI looks coach. Ask me anything about improving your appearance — skincare, mewing, hairstyles, gym, or get personalised advice based on your scan results."

const QUICK_ACTIONS = [
  "Analyse my scan results",
  "Best skincare routine",
  "How to improve my jawline",
  "Hairstyle for my face shape",
]

function formatMessage(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "• $1")
    .replace(/\n/g, "<br>")
}

function getScanContext(): string | null {
  if (typeof window === "undefined") return null

  const last = localStorage.getItem("lastScanResults")
  if (last) return last

  const seed = localStorage.getItem("chatSeed")
  if (seed) return seed

  const scans = getScanHistory()
  if (scans.length === 0) return null

  const s = scans[0]
  const lines = s.breakdown
    .filter((b) => !b.unreliable)
    .map((b) => `${b.label}: ${b.score}/100 (${b.measured}, ideal ${b.ideal})`)

  const label = s.scanType === "profile" ? "Side profile" : "Front face"
  return `${label} scan — Overall: ${s.overall}/100.\n${lines.join("\n")}`
}

export default function ChatPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendDisabled, setSendDisabled] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const gender = getUserProfile()?.gender ?? "male"
  const scannerHref = `/scanner/${gender}`
  const profileHref = `/scanner/side-${gender}`

  useEffect(() => {
    if (!getUserProfile()) {
      router.replace("/login")
      return
    }
    setReady(true)
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || sendDisabled) return

      setShowQuickActions(false)
      setSendDisabled(true)
      setTimeout(() => setSendDisabled(false), 1000)

      const userMsg: Message = { role: "user", content: trimmed }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setInput("")
      setLoading(true)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            scanContext: getScanContext(),
          }),
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          const msg = res.status === 503
            ? (data.error as string)
            : "Something went wrong, try again."
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: msg, error: true },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply as string },
          ])
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong, try again.", error: true },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [loading, messages, sendDisabled]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AppShell scannerHref={scannerHref} profileHref={profileHref}>
      <div className="flex flex-col h-screen max-h-[100dvh]">
        <header className="shrink-0 px-4 lg:px-6 py-4 border-b border-border bg-bg">
          <h1 className="text-xl font-bold text-text-primary">Chat with Max</h1>
          <p className="text-sm text-text-secondary">Your AI looks coach</p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-accent-tertiary/30 text-accent-tertiary flex items-center justify-center text-sm font-bold">
                  M
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.error
                    ? "bg-error/15 border border-error/30 text-error"
                    : msg.role === "user"
                      ? "bg-accent text-white"
                      : "bg-card border border-border text-text-primary"
                }`}
              >
                {msg.role === "assistant" && !msg.error ? (
                  <div
                    className="[&_strong]:font-semibold [&_strong]:text-text-primary"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 shrink-0 rounded-full bg-accent-tertiary/30 text-accent-tertiary flex items-center justify-center text-sm font-bold">
                M
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-text-muted animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {showQuickActions && messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 pt-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => sendMessage(action)}
                  disabled={sendDisabled}
                  className="text-xs sm:text-sm px-3 py-2 rounded-xl border border-border bg-card text-text-secondary hover:border-accent/40 hover:text-text-primary transition active:scale-[0.98] disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 px-4 lg:px-6 py-4 border-t border-border bg-bg pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              placeholder="Ask Max anything…"
              rows={1}
              maxLength={2000}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 disabled:opacity-50 min-h-[44px] max-h-32"
            />
            <button
              type="submit"
              disabled={loading || sendDisabled || !input.trim()}
              className="shrink-0 px-5 py-3 rounded-xl bg-accent text-white font-semibold hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          {input.length > 1800 && (
            <p className="text-xs text-text-muted text-center mt-1 max-w-3xl mx-auto">
              {input.length}/2000
            </p>
          )}
        </form>
      </div>
    </AppShell>
  )
}

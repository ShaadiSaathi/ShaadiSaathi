"use client"

/**
 * Bare-bones staging test UI for /api/wedding-chat.
 * Full chatbot UX comes later — this is for validating RAG + premium gate.
 */

import { useState } from "react"
import Link from "next/link"
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

export default function WeddingAiTestPage() {
  const { firebaseUser, isFamilyLoggedIn, authLoading } = useAuth()
  const { isFamilyPremium } = usePremium()
  const [question, setQuestion] = useState(
    "What colours and decor work well for a Pakistani mehndi?"
  )
  const [reply, setReply] = useState("")
  const [citations, setCitations] = useState<Citation[]>([])
  const [retrieved, setRetrieved] = useState<RetrievedMeta[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function ask() {
    setBusy(true)
    setError("")
    setReply("")
    setCitations([])
    setRetrieved([])
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
      }
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`)
        return
      }
      setReply(data.reply || "")
      setCitations(data.citations || [])
      setRetrieved(data.retrieved || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  if (authLoading) {
    return <p className="p-8 text-sm text-maroon/60">Loading…</p>
  }

  if (!isFamilyLoggedIn || !firebaseUser) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="font-display text-2xl text-maroon-dark">Wedding AI (test)</h1>
        <p className="mt-2 text-sm text-maroon/70">
          Sign in to try the premium wedding assistant.{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-maroon-dark">
        Wedding AI (test)
      </h1>
      <p className="mt-1 text-sm text-maroon/60">
        Minimal RAG test UI — South Asian knowledge base only. Premium:{" "}
        <strong>{isFamilyPremium ? "yes" : "no"}</strong>
        {!isFamilyPremium && (
          <>
            {" "}
            — non-premium accounts should get a 403.{" "}
            <Link href="/upgrade?feature=wedding-ai" className="underline">
              Upgrade
            </Link>
          </>
        )}
      </p>

      <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-maroon/50">
        Question
      </label>
      <textarea
        className="mt-2 w-full rounded-xl border border-gold/30 bg-white p-3 text-sm text-maroon-dark"
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        type="button"
        disabled={busy || !question.trim()}
        onClick={() => void ask()}
        className="mt-3 rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-ivory disabled:opacity-50"
      >
        {busy ? "Asking…" : "Ask"}
      </button>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {reply && (
        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon/50">
            Answer
          </h2>
          <div className="whitespace-pre-wrap rounded-xl border border-gold/25 bg-white p-4 text-sm text-maroon-dark">
            {reply}
          </div>
        </section>
      )}

      {citations.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon/50">
            Learn more
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {citations.map((c) => (
              <li key={c.url}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-maroon underline"
                >
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {retrieved.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon/50">
            Retrieved chunks (debug)
          </h2>
          <ul className="mt-2 space-y-1 font-mono text-xs text-maroon/70">
            {retrieved.map((r) => (
              <li key={r.id}>
                {r.score.toFixed(3)} · {r.chunkType}
                {r.anecdotal ? " · anecdotal" : ""} · {r.region}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

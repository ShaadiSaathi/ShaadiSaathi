"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import JaaliDivider from "@/components/shaadi-saathi/JaaliDivider"
import GuestInvitePage from "@/components/shaadi-saathi/guests/GuestInvitePage"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import {
  EVENTS,
  WEDDING,
  WEDDING_PUBLIC_INVITE_TOKEN,
  formatEventDate,
} from "@/lib/mockData"
import { getInviteTheme, type InviteThemeId } from "@/lib/premium"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  updateGuestRsvpBulkByGuest,
} from "@/lib/firebase/guests"
import { getWedding, subscribeWedding } from "@/lib/firebase/weddings"

interface WeddingInvitePageProps {
  token: string
}

type PendingChoice = "confirmed" | "declined" | "open"

export default function WeddingInvitePage({ token }: WeddingInvitePageProps) {
  const router = useRouter()
  const { guests, addGuest } = useGuests()
  const [resolvedToken, setResolvedToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [coupleName, setCoupleName] = useState(WEDDING.couple)
  const [weddingName, setWeddingName] = useState(WEDDING.name)
  const [inviteTheme, setInviteTheme] = useState<InviteThemeId>("classic")
  const [isPremium, setIsPremium] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showIdentify, setShowIdentify] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null)

  const isMockToken =
    token === WEDDING_PUBLIC_INVITE_TOKEN || token === WEDDING.id

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      if (!isMockToken) {
        setInvalid(true)
      }
      setLoading(false)
      return
    }

    let unsub: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      try {
        const wedding = await getWedding(token)
        if (cancelled) return
        if (!wedding) {
          setInvalid(true)
          setLoading(false)
          return
        }
        setCoupleName(wedding.couple)
        setWeddingName(wedding.name)
        setInviteTheme(wedding.inviteTheme)
        setIsPremium(wedding.isPremium)
        setLoading(false)
        unsub = subscribeWedding(wedding.id, (w) => {
          if (!w) return
          setCoupleName(w.couple)
          setWeddingName(w.name)
          setInviteTheme(w.inviteTheme)
          setIsPremium(w.isPremium)
        })
      } catch {
        if (!cancelled) {
          setInvalid(true)
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [token, isMockToken])

  async function claimGuest(): Promise<string | null> {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError("Please enter your name so we can find your invitation.")
      return null
    }

    if (!isFirebaseConfigured()) {
      const existing = guests.find(
        (g) => g.name.trim().toLowerCase() === trimmed.toLowerCase()
      )
      if (existing) return existing.inviteToken
      const created = await addGuest({
        name: trimmed,
        phone: phone.trim() || undefined,
        events: EVENTS.map((e) => e.id),
      })
      return created.inviteToken
    }

    const res = await fetch(`/api/invite/wedding/${encodeURIComponent(token)}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        phone: phone.trim() || undefined,
      }),
    })
    const data = (await res.json()) as { inviteToken?: string; error?: string }
    if (!res.ok || !data.inviteToken) {
      setError(data.error ?? "Could not open your invitation. Please try again.")
      return null
    }
    return data.inviteToken
  }

  async function continueToRsvp(choiceOverride?: PendingChoice) {
    if (busy) return
    setBusy(true)
    setError(null)
    const choice = choiceOverride ?? pendingChoice
    try {
      const inviteToken = await claimGuest()
      if (!inviteToken) return

      if (
        isFirebaseConfigured() &&
        (choice === "confirmed" || choice === "declined")
      ) {
        await updateGuestRsvpBulkByGuest(
          inviteToken,
          choice,
          EVENTS.map((e) => e.id)
        )
      }

      setResolvedToken(inviteToken)
      setShowIdentify(false)
      router.replace(`/invite/${inviteToken}`)
    } finally {
      setBusy(false)
    }
  }

  function requestIdentify(choice: PendingChoice = "open") {
    setPendingChoice(choice)
    setShowIdentify(true)
    setError(null)
  }

  if (resolvedToken) {
    return <GuestInvitePage guestToken={resolvedToken} key={resolvedToken} />
  }

  if (loading) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-5">
        <p className="text-maroon/60">Loading invitation…</p>
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-5">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-maroon-dark">
            Invitation not found
          </h1>
          <p className="mt-2 text-maroon/60">This wedding invite link is invalid.</p>
        </div>
      </div>
    )
  }

  const theme = getInviteTheme(inviteTheme)

  return (
    <div className={`shaadi-saathi relative min-h-screen overflow-hidden ${theme.bg} text-maroon-dark`}>
      <MehndiPattern opacity={0.08} />

      <div className={`relative border-b ${theme.cardBorder} bg-gradient-to-b ${theme.motif} px-5 py-10 text-center`}>
        <p className={`text-xs font-medium uppercase tracking-[0.25em] ${theme.accent}`}>
          You are cordially invited
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 font-display text-3xl font-bold sm:text-5xl ${theme.heading}`}
        >
          {coupleName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 font-display text-lg text-maroon/70"
        >
          {weddingName}
        </motion.p>
      </div>

      <main className="relative mx-auto max-w-lg px-5 py-8">
        <div className="mb-8">
          <JaaliDivider />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/15 via-white to-maroon/5 p-5 shadow-md"
        >
          <p className={`text-center text-[11px] font-semibold uppercase tracking-[0.2em] ${theme.accent}`}>
            RSVP to the celebrations
          </p>
          <p className="mt-2 text-center font-display text-lg font-semibold text-maroon-dark">
            Enter your name to open your interactive invitation
          </p>
          <p className="mt-1 text-center text-xs text-maroon/55">
            You can accept everything at once, or choose event by event.
          </p>

          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void continueToRsvp("open")
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-maroon/60">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As it appears on the guest list"
                autoComplete="name"
                className="w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-maroon-dark outline-none ring-maroon/20 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-maroon/60">
                Phone <span className="font-normal text-maroon/40">(optional)</span>
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Helps if two guests share a name"
                autoComplete="tel"
                className="w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-maroon-dark outline-none ring-maroon/20 focus:ring-2"
              />
            </label>
            {error ? <p className="text-center text-sm text-red-700/80">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-2xl bg-maroon px-4 py-3 text-sm font-semibold text-ivory shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
            >
              {busy ? "Opening your invitation…" : "Continue to RSVP"}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!name.trim()) {
                  requestIdentify("confirmed")
                  return
                }
                void continueToRsvp("confirmed")
              }}
              className="min-h-11 flex-1 rounded-2xl bg-maroon/90 px-4 py-3 text-sm font-semibold text-ivory transition hover:bg-maroon-dark disabled:opacity-60"
            >
              Accepting All Events with Joy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!name.trim()) {
                  requestIdentify("declined")
                  return
                }
                void continueToRsvp("declined")
              }}
              className="min-h-11 flex-1 rounded-2xl border border-maroon/25 bg-white/90 px-4 py-3 text-sm font-medium text-maroon/75 transition hover:bg-maroon/5 disabled:opacity-60"
            >
              Sadly Declining All Events
            </button>
          </div>
        </motion.section>

        <div className="mt-8 space-y-6">
          {EVENTS.map((event, i) => (
            <motion.article
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm"
            >
              <div className={`px-5 py-3 ${event.color}`}>
                <h2 className="font-display text-xl font-semibold text-maroon-dark">
                  {event.name}
                </h2>
              </div>
              <div className="space-y-2 px-5 py-4 text-sm text-maroon/70">
                <p className="font-medium text-maroon-dark">
                  {formatEventDate(event.date)} · {event.time}
                </p>
                <p>{event.venue}</p>
                <p className="text-maroon/50">{event.address}</p>
                <p className="pt-1 italic text-maroon/50">{event.description}</p>
              </div>
              <div className="border-t border-gold/15 bg-ivory/50 px-5 py-4">
                <p className="mb-3 text-center text-sm font-medium text-maroon/70">
                  Will you be joining us?
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!name.trim()) {
                        requestIdentify("confirmed")
                        return
                      }
                      void continueToRsvp("confirmed")
                    }}
                    className="min-h-11 flex-1 rounded-xl bg-maroon/90 px-4 py-3 text-sm font-semibold text-ivory hover:bg-maroon-dark disabled:opacity-60"
                  >
                    Accepting with Joy
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!name.trim()) {
                        requestIdentify("declined")
                        return
                      }
                      void continueToRsvp("declined")
                    }}
                    className="min-h-11 flex-1 rounded-xl border border-maroon/20 bg-white px-4 py-3 text-sm font-semibold text-maroon/70 hover:bg-maroon/5 disabled:opacity-60"
                  >
                    Sadly Declining
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <footer className="mt-12 pb-8 text-center">
          <p className="text-xs text-maroon/40">With love, {coupleName}</p>
          {!isPremium && (
            <p className="mt-1 text-xs text-maroon/30">Powered by Shaadi Saathi</p>
          )}
        </footer>
      </main>

      <AnimatePresence>
        {showIdentify ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="identify-title"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl"
            >
              <h2 id="identify-title" className="font-display text-xl font-semibold text-maroon-dark">
                Who is responding?
              </h2>
              <p className="mt-1 text-sm text-maroon/60">
                Enter your name to open the interactive RSVP
                {pendingChoice === "confirmed"
                  ? " and accept with joy"
                  : pendingChoice === "declined"
                    ? " and decline"
                    : ""}
                .
              </p>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-medium text-maroon/60">Your name</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm outline-none ring-maroon/20 focus:ring-2"
                />
              </label>
              {error ? <p className="mt-2 text-sm text-red-700/80">{error}</p> : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIdentify(false)}
                  className="min-h-11 flex-1 rounded-xl border border-maroon/15 px-4 text-sm text-maroon/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void continueToRsvp(pendingChoice ?? "open")}
                  className="min-h-11 flex-1 rounded-xl bg-maroon px-4 text-sm font-semibold text-ivory disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Continue"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

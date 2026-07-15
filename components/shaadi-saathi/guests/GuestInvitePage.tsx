"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import JaaliDivider from "@/components/shaadi-saathi/JaaliDivider"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import {
  EVENTS,
  WEDDING,
  formatEventDate,
  type EventId,
  type Guest,
} from "@/lib/mockData"
import { getInviteTheme, type InviteThemeId } from "@/lib/premium"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  getGuestByInviteToken,
  subscribeGuestByToken,
  updateGuestRsvpByGuest as updateGuestRsvpFirestore,
} from "@/lib/firebase/guests"
import { getWedding, subscribeWedding } from "@/lib/firebase/weddings"

interface GuestInvitePageProps {
  guestToken: string
}

type RsvpChoice = "confirmed" | "declined"

export default function GuestInvitePage({ guestToken }: GuestInvitePageProps) {
  const { guests, getGuestByToken, updateRsvpByGuest } = useGuests()
  const [firestoreGuest, setFirestoreGuest] = useState<Guest | null>(null)
  const [guestLoading, setGuestLoading] = useState(isFirebaseConfigured())
  const [invalid, setInvalid] = useState(false)
  const [coupleName, setCoupleName] = useState(WEDDING.couple)
  const [weddingName, setWeddingName] = useState(WEDDING.name)
  const [inviteTheme, setInviteTheme] = useState<InviteThemeId>("classic")
  const [isPremium, setIsPremium] = useState(false)

  const mockGuest = useMemo(
    () => getGuestByToken(guestToken) ?? guests.find((g) => g.inviteToken === guestToken),
    [guestToken, getGuestByToken, guests]
  )

  const guest = isFirebaseConfigured() ? firestoreGuest : mockGuest

  useEffect(() => {
    if (!isFirebaseConfigured()) return

    let weddingUnsub: (() => void) | undefined

    const guestUnsub = subscribeGuestByToken(
      guestToken,
      async (g) => {
        if (!g) {
          const oneShot = await getGuestByInviteToken(guestToken)
          if (!oneShot) {
            setInvalid(true)
            setGuestLoading(false)
            return
          }
          setFirestoreGuest(oneShot)
        } else {
          setFirestoreGuest(g)
        }
        setGuestLoading(false)

        const loaded = g ?? (await getGuestByInviteToken(guestToken))
        if (loaded) {
          const wedding = await getWedding(
            (loaded as Guest & { weddingId?: string }).weddingId ??
              (await getGuestDocWeddingId(guestToken))
          )
          if (wedding) {
            setCoupleName(wedding.couple)
            setWeddingName(wedding.name)
            setInviteTheme(wedding.inviteTheme)
            setIsPremium(wedding.isPremium)
            weddingUnsub = subscribeWedding(wedding.id, (w) => {
              if (w) {
                setCoupleName(w.couple)
                setInviteTheme(w.inviteTheme)
                setIsPremium(w.isPremium)
              }
            })
          } else {
            setInvalid(true)
          }
        }
      },
      () => {
        setInvalid(true)
        setGuestLoading(false)
      }
    )

    return () => {
      guestUnsub()
      weddingUnsub?.()
    }
  }, [guestToken])

  const theme = getInviteTheme(inviteTheme)

  const [submitted, setSubmitted] = useState<Record<EventId, boolean>>({
    mehndi: false,
    baraat: false,
    walima: false,
  })

  if (guestLoading) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-5">
        <p className="text-maroon/60">Loading your invitation…</p>
      </div>
    )
  }

  if (!guest || invalid) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-5">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-maroon-dark">
            This invite is no longer valid
          </h1>
          <p className="mt-2 text-maroon/60">
            This invitation may have expired, been withdrawn, or the link is incorrect. Please
            contact the family directly.
          </p>
        </div>
      </div>
    )
  }

  const invitedEvents = EVENTS.filter((e) => guest.events.includes(e.id))

  async function handleRsvp(eventId: EventId, choice: RsvpChoice) {
    if (isFirebaseConfigured()) {
      await updateGuestRsvpFirestore(guest!.inviteToken, eventId, choice)
    } else {
      updateRsvpByGuest(guest!.id, eventId, choice)
    }
    setSubmitted((prev) => ({ ...prev, [eventId]: true }))
  }

  return (
    <div className={`shaadi-saathi relative min-h-screen overflow-hidden ${theme.bg} text-maroon-dark`}>
      <MehndiPattern opacity={0.08} />

      <div className={`relative border-b ${theme.cardBorder} bg-gradient-to-b ${theme.motif} px-5 py-8 text-center`}>
        <p className={`text-xs font-medium uppercase tracking-[0.25em] ${theme.accent}`}>
          You are cordially invited
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`mt-3 font-display text-3xl font-bold sm:text-4xl ${theme.heading}`}
        >
          {coupleName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-2 font-display text-lg text-maroon/70"
        >
          request the pleasure of your company
        </motion.p>
        <p className="mt-4 text-sm text-maroon/50">
          Dear <span className="font-medium text-maroon-dark">{guest.name}</span>
        </p>
      </div>

      <main className="relative mx-auto max-w-lg px-5 py-8">
        <div className="mb-8">
          <JaaliDivider />
        </div>

        <div className="space-y-6">
          {invitedEvents.map((event, i) => (
            <EventRsvpCard
              key={event.id}
              event={event}
              guest={guest}
              index={i}
              justSubmitted={submitted[event.id]}
              onRsvp={(choice) => handleRsvp(event.id, choice)}
            />
          ))}
        </div>

        <footer className="mt-12 pb-8 text-center">
          <p className="text-xs text-maroon/40">With love, {coupleName}</p>
          {!isPremium && (
            <p className="mt-1 text-xs text-maroon/30">Powered by Shaadi Saathi</p>
          )}
        </footer>
      </main>
    </div>
  )
}

async function getGuestDocWeddingId(token: string): Promise<string> {
  const g = await getGuestByInviteToken(token)
  if (!g) return WEDDING.id
  const { getFirestoreDb } = await import("@/lib/firebase/config")
  const { getDoc, doc } = await import("firebase/firestore")
  const snap = await getDoc(doc(getFirestoreDb(), "guests", token))
  return (snap.data()?.weddingId as string) ?? WEDDING.id
}

function EventRsvpCard({
  event,
  guest,
  index,
  justSubmitted,
  onRsvp,
}: {
  event: (typeof EVENTS)[number]
  guest: Guest
  index: number
  justSubmitted: boolean
  onRsvp: (choice: RsvpChoice) => void
}) {
  const status = guest.rsvp[event.id]
  const showConfirmation =
    justSubmitted || status === "confirmed" || status === "declined"

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.5 }}
      className="overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm"
    >
      <div className={`px-5 py-3 ${event.color}`}>
        <h2 className="font-display text-xl font-semibold text-maroon-dark">{event.name}</h2>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-start gap-3 text-sm text-maroon/70">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <div>
            <p className="font-medium text-maroon-dark">{formatEventDate(event.date)}</p>
            <p>{event.time}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-sm text-maroon/70">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <div>
            <p className="font-medium text-maroon-dark">{event.venue}</p>
            <p>{event.address}</p>
          </div>
        </div>

        <p className="text-sm italic text-maroon/50">{event.description}</p>
      </div>

      <div className="border-t border-gold/15 bg-ivory/50 px-5 py-4">
        {status === "cancelled" ? (
          <p className="text-center text-sm text-slate-500">
            This invitation has been withdrawn by the hosts.
          </p>
        ) : showConfirmation ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {status === "confirmed" ? (
              <>
                <p className="font-display text-lg font-semibold text-emerald-800">
                  Shukriya — we can&apos;t wait to celebrate with you!
                </p>
                <p className="mt-1 text-sm text-maroon/60">
                  Thank you for letting us know. See you at {event.name}!
                </p>
              </>
            ) : status === "declined" ? (
              <>
                <p className="font-display text-lg font-semibold text-maroon-dark">
                  Thank you for letting us know
                </p>
                <p className="mt-1 text-sm text-maroon/60">
                  We&apos;ll miss you, but we appreciate your response.
                </p>
              </>
            ) : (
              <p className="text-sm text-maroon/60">Awaiting your response...</p>
            )}
            {(status === "confirmed" || status === "declined") && (
              <button
                type="button"
                onClick={() => onRsvp(status === "confirmed" ? "declined" : "confirmed")}
                className="mt-3 inline-flex min-h-[44px] items-center text-xs text-maroon/40 underline hover:text-maroon/60"
              >
                Change my response
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm font-medium text-maroon/70">Will you be joining us?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => onRsvp("confirmed")}
                className="min-h-11 flex-1 rounded-xl bg-maroon px-4 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon/30"
                aria-label={`Accept invitation to ${event.name}`}
              >
                Accepting with Joy
              </button>
              <button
                type="button"
                onClick={() => onRsvp("declined")}
                className="min-h-11 flex-1 rounded-xl border border-maroon/20 bg-white px-4 py-3 text-sm font-medium text-maroon/70 transition-colors hover:border-maroon/30 hover:bg-maroon/5 focus:outline-none focus:ring-2 focus:ring-maroon/10"
                aria-label={`Decline invitation to ${event.name}`}
              >
                Sadly Declining
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.article>
  )
}

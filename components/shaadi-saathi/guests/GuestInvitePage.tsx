"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import JaaliDivider from "@/components/shaadi-saathi/JaaliDivider"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import {
  WEDDING,
  formatEventDate,
  guestPartySize,
  isGuestGroup,
  type EventId,
  type Guest,
} from "@/lib/mockData"
import {
  DEFAULT_WEDDING_TIMEZONE,
  isEventRsvpLocked,
  loadLocalEventOverrides,
  resolveWeddingEvent,
  type ResolvedWeddingEvent,
  type WeddingEventOverrides,
} from "@/lib/events/rsvp-lock"
import { getInviteTheme, type InviteThemeId } from "@/lib/premium"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  getGuestByInviteToken,
  subscribeGuestByToken,
} from "@/lib/firebase/guests"
import {
  updateGuestRsvpBulkByGuestViaApi,
  updateGuestRsvpByGuestViaApi,
} from "@/lib/firebase/guest-rsvp-client"
import { getWedding, subscribeWedding } from "@/lib/firebase/weddings"

interface GuestInvitePageProps {
  guestToken: string
}

type RsvpChoice = "confirmed" | "declined"

function formatLastUpdated(ms: number | null | undefined): string | null {
  if (!ms) return null
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString()
  }
}

export default function GuestInvitePage({ guestToken }: GuestInvitePageProps) {
  const {
    guests,
    getGuestByToken,
    updateRsvpByGuest,
    updateRsvpBulkByGuest,
  } = useGuests()
  const [firestoreGuest, setFirestoreGuest] = useState<Guest | null>(null)
  const [guestLoading, setGuestLoading] = useState(isFirebaseConfigured())
  const [invalid, setInvalid] = useState(false)
  const [coupleName, setCoupleName] = useState(WEDDING.couple)
  const [inviteTheme, setInviteTheme] = useState<InviteThemeId>("classic")
  const [isPremium, setIsPremium] = useState(false)
  const [eventOverrides, setEventOverrides] = useState<WeddingEventOverrides>({})
  const [weddingTimeZone, setWeddingTimeZone] = useState(DEFAULT_WEDDING_TIMEZONE)
  const [toast, setToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pulseEvent, setPulseEvent] = useState<EventId | null>(null)
  const [pulseAll, setPulseAll] = useState(false)

  const mockGuest = useMemo(
    () => getGuestByToken(guestToken) ?? guests.find((g) => g.inviteToken === guestToken),
    [guestToken, getGuestByToken, guests]
  )

  const guest = isFirebaseConfigured() ? firestoreGuest : mockGuest
  const guestDisplayName = guest?.name?.trim() ?? ""
  const guestPhone = guest?.phone?.trim() ?? ""
  const maskedPhone = guestPhone.length > 6
    ? `${guestPhone.slice(0, 4)}••••${guestPhone.slice(-2)}`
    : guestPhone
  const partySize = guest ? guestPartySize(guest) : 1
  const groupInvite = guest ? isGuestGroup(guest) : false
  const nameWithPhone = maskedPhone
    ? `${guestDisplayName} (${maskedPhone})`
    : guestDisplayName
  const respondingAsLabel = groupInvite
    ? `${nameWithPhone} — ${partySize} guests`
    : nameWithPhone
  const inviteUnusable = invalid || !guest || !guestDisplayName

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!errorToast) return
    const t = window.setTimeout(() => setErrorToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [errorToast])

  useEffect(() => {
    if (!pulseEvent && !pulseAll) return
    const t = window.setTimeout(() => {
      setPulseEvent(null)
      setPulseAll(false)
    }, 700)
    return () => window.clearTimeout(t)
  }, [pulseEvent, pulseAll])

  useEffect(() => {
    if (isFirebaseConfigured()) return
    setEventOverrides(loadLocalEventOverrides())
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured()) return

    let weddingUnsub: (() => void) | undefined

    const guestUnsub = subscribeGuestByToken(
      guestToken,
      async (g) => {
        if (!g) {
          const oneShot = await getGuestByInviteToken(guestToken)
          if (!oneShot || !oneShot.name?.trim()) {
            setInvalid(true)
            setGuestLoading(false)
            return
          }
          setFirestoreGuest(oneShot)
        } else if (!g.name?.trim()) {
          setInvalid(true)
          setGuestLoading(false)
          return
        } else {
          setFirestoreGuest(g)
        }
        setGuestLoading(false)

        const loaded = g ?? (await getGuestByInviteToken(guestToken))
        if (loaded) {
          try {
            const weddingId =
              (loaded as Guest & { weddingId?: string }).weddingId ??
              (await getGuestDocWeddingId(guestToken))
            const wedding = await getWedding(weddingId)
            if (wedding) {
              setCoupleName(wedding.couple)
              setInviteTheme(wedding.inviteTheme)
              setIsPremium(wedding.isPremium)
              setEventOverrides(wedding.eventOverrides ?? {})
              setWeddingTimeZone(wedding.timezone ?? DEFAULT_WEDDING_TIMEZONE)
              weddingUnsub = subscribeWedding(wedding.id, (w) => {
                if (w) {
                  setCoupleName(w.couple)
                  setInviteTheme(w.inviteTheme)
                  setIsPremium(w.isPremium)
                  setEventOverrides(w.eventOverrides ?? {})
                  setWeddingTimeZone(w.timezone ?? DEFAULT_WEDDING_TIMEZONE)
                }
              })
            }
            // Wedding read may fail under older rules; RSVP still works from the guest doc.
          } catch {
            // Keep default couple/theme; don't block the invite RSVP UI.
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

  if (guestLoading) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-5">
        <p className="text-maroon/60">Loading your invitation…</p>
      </div>
    )
  }

  if (inviteUnusable) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-5">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-maroon-dark">
            This invite link isn&apos;t valid
          </h1>
          <p className="mt-2 text-maroon/60">
            This invitation may have expired, been withdrawn, or the link is incorrect. Please
            contact the family directly.
          </p>
        </div>
      </div>
    )
  }

  const invitedEvents = guest.events
    .map((id) => resolveWeddingEvent(id, eventOverrides))
    .filter((e): e is ResolvedWeddingEvent => Boolean(e))
  const invitedIds = invitedEvents.map((e) => e.id)
  const openInvitedEvents = invitedEvents.filter(
    (e) => !isEventRsvpLocked(e, { timeZone: weddingTimeZone })
  )
  const lockedInvitedEvents = invitedEvents.filter((e) =>
    isEventRsvpLocked(e, { timeZone: weddingTimeZone })
  )
  const openInvitedIds = openInvitedEvents.map((e) => e.id)

  function showUpdatedToast(detail?: string) {
    setErrorToast(null)
    setToast(detail || "Got it, we've updated your response!")
  }

  function showErrorToast(message?: string) {
    setToast(null)
    setErrorToast(message || "Something went wrong, please try again")
  }

  async function handleRsvp(eventId: EventId, choice: RsvpChoice) {
    if (busy) return
    const event = resolveWeddingEvent(eventId, eventOverrides)
    if (event && isEventRsvpLocked(event, { timeZone: weddingTimeZone })) {
      showErrorToast(`RSVPs for ${event.name} are now closed.`)
      return
    }
    setBusy(true)
    setErrorToast(null)
    try {
      // Always write against the invite URL token (Firestore doc id).
      const token = guestToken
      console.info("[GuestInvitePage] individual RSVP tap", { token, eventId, choice })
      if (isFirebaseConfigured()) {
        await updateGuestRsvpByGuestViaApi(token, eventId, choice)
      } else {
        await updateRsvpByGuest(guest!.id, eventId, choice)
      }
      console.info("[GuestInvitePage] individual RSVP saved", { token, eventId, choice })
      setPulseEvent(eventId)
      showUpdatedToast()
    } catch (err) {
      console.error("[GuestInvitePage] individual RSVP failed", err)
      showErrorToast(
        err instanceof Error ? err.message : "Something went wrong, please try again"
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleBulkRsvp(choice: RsvpChoice) {
    if (busy || invitedIds.length === 0) return
    if (openInvitedIds.length === 0) {
      showErrorToast(
        lockedInvitedEvents.length === 1
          ? `RSVPs for ${lockedInvitedEvents[0]!.name} are now closed.`
          : "RSVPs for these events are now closed."
      )
      return
    }
    setBusy(true)
    setErrorToast(null)
    try {
      const token = guestToken
      console.info("[GuestInvitePage] bulk RSVP tap", {
        token,
        choice,
        openInvitedIds,
        skippedLocked: lockedInvitedEvents.map((e) => e.id),
      })
      if (isFirebaseConfigured()) {
        await updateGuestRsvpBulkByGuestViaApi(token, choice, openInvitedIds)
      } else {
        await updateRsvpBulkByGuest(guest!.id, choice, openInvitedIds)
      }
      console.info("[GuestInvitePage] bulk RSVP saved", { token, choice })
      setPulseAll(true)
      if (lockedInvitedEvents.length > 0) {
        const skipped = lockedInvitedEvents.map((e) => e.name).join(", ")
        showUpdatedToast(
          `Updated open events. Skipped locked: ${skipped}.`
        )
      } else {
        showUpdatedToast()
      }
    } catch (err) {
      console.error("[GuestInvitePage] bulk RSVP failed", err)
      showErrorToast(
        err instanceof Error ? err.message : "Something went wrong, please try again"
      )
    } finally {
      setBusy(false)
    }
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
      </div>

      <main className="relative mx-auto max-w-lg px-5 py-8">
        <div className="mb-6">
          <JaaliDivider />
        </div>

        {/* Identity confirmation — must be obvious before any RSVP action */}
        <section
          aria-label="Guest identity confirmation"
          className={`mb-6 rounded-2xl border-2 ${theme.cardBorder} bg-white/90 px-5 py-5 text-center shadow-sm`}
        >
          <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${theme.accent}`}>
            Responding as
          </p>
          <p className={`mt-2 font-display text-2xl font-bold sm:text-3xl ${theme.heading}`}>
            {respondingAsLabel}
          </p>
          <p className="mt-2 text-sm text-maroon/55">
            {groupInvite
              ? "One response for the whole household. If this isn't your family, please close this page and open your own invite link."
              : "If this isn't you, please close this page and open your own invite link."}
          </p>
        </section>

        {invitedIds.length > 1 && openInvitedIds.length > 0 && (
          <BulkRsvpBanner
            disabled={busy}
            themeAccent={theme.accent}
            guestName={respondingAsLabel}
            lockedEventNames={lockedInvitedEvents.map((e) => e.name)}
            onAcceptAll={() => void handleBulkRsvp("confirmed")}
            onDeclineAll={() => void handleBulkRsvp("declined")}
          />
        )}

        <div className="mt-6 space-y-6">
          {invitedEvents.map((event, i) => (
            <EventRsvpCard
              key={event.id}
              event={event}
              guest={guest}
              guestName={respondingAsLabel}
              index={i}
              busy={busy}
              locked={isEventRsvpLocked(event, { timeZone: weddingTimeZone })}
              pulse={pulseAll || pulseEvent === event.id}
              onRsvp={(choice) => void handleRsvp(event.id, choice)}
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

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-full border border-gold/30 bg-maroon px-5 py-3 text-sm font-medium text-ivory shadow-lg">
              {toast}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {errorToast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
            role="alert"
            aria-live="assertive"
          >
            <div className="rounded-full border border-rose-300 bg-rose-800 px-5 py-3 text-sm font-medium text-white shadow-lg">
              {errorToast}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function BulkRsvpBanner({
  disabled,
  themeAccent,
  guestName,
  lockedEventNames,
  onAcceptAll,
  onDeclineAll,
}: {
  disabled: boolean
  themeAccent: string
  guestName: string
  lockedEventNames: string[]
  onAcceptAll: () => void
  onDeclineAll: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/15 via-white to-maroon/5 p-5 shadow-md"
      aria-label="Respond to all events at once"
    >
      <p className={`text-center text-[11px] font-semibold uppercase tracking-[0.2em] ${themeAccent}`}>
        Respond for everything at once
      </p>
      <p className="mt-2 text-center font-display text-lg font-semibold text-maroon-dark">
        One tap for every celebration
      </p>
      <p className="mt-1 text-center text-xs text-maroon/55">
        These responses will be saved for{" "}
        <span className="font-semibold text-maroon-dark">{guestName}</span>. You can still adjust
        individual events below anytime.
      </p>
      {lockedEventNames.length > 0 && (
        <p className="mt-2 text-center text-xs text-maroon/55">
          Closed events will be skipped:{" "}
          <span className="font-semibold text-maroon-dark">{lockedEventNames.join(", ")}</span>.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={onAcceptAll}
          className="min-h-14 flex-1 rounded-2xl bg-maroon px-4 py-3.5 text-base font-semibold text-ivory shadow-sm transition hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon/30 disabled:opacity-60 sm:min-h-12 sm:text-sm sm:py-3"
        >
          Accepting All Events with Joy
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDeclineAll}
          className="min-h-14 flex-1 rounded-2xl border border-maroon/25 bg-white/90 px-4 py-3.5 text-base font-medium text-maroon/75 transition hover:border-maroon/40 hover:bg-maroon/5 focus:outline-none focus:ring-2 focus:ring-maroon/10 disabled:opacity-60 sm:min-h-12 sm:text-sm sm:py-3"
        >
          Sadly Declining All Events
        </button>
      </div>
    </motion.section>
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
  guestName,
  index,
  busy,
  locked,
  pulse,
  onRsvp,
}: {
  event: ResolvedWeddingEvent
  guest: Guest
  guestName: string
  index: number
  busy: boolean
  locked: boolean
  pulse: boolean
  onRsvp: (choice: RsvpChoice) => void
}) {
  const status = guest.rsvp[event.id]
  const lastUpdated = formatLastUpdated(guest.rsvpUpdatedAt?.[event.id])
  const withdrawn = status === "cancelled"
  const confirmed = status === "confirmed"
  const declined = status === "declined"

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
        {withdrawn ? (
          <p className="text-center text-sm text-slate-500">
            This invitation has been withdrawn by the hosts.
          </p>
        ) : locked ? (
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium text-maroon-dark">
              {confirmed
                ? `Your response: Accepting with Joy`
                : declined
                  ? `Your response: Sadly Declining`
                  : status === "pending"
                    ? "No response recorded yet"
                    : null}
            </p>
            <p className="text-sm leading-relaxed text-maroon/65">
              RSVPs for {event.name} are now closed. Please contact the family directly for any
              changes.
            </p>
            {lastUpdated ? (
              <p className="text-[11px] text-maroon/40">Last updated {lastUpdated}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-maroon/70">
              Will you be joining us,{" "}
              <span className="font-semibold text-maroon-dark">{guestName}</span>?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <RsvpChoiceButton
                selected={confirmed}
                pulse={pulse && confirmed}
                disabled={busy}
                variant="accept"
                label="Accepting with Joy"
                ariaLabel={`Accept invitation to ${event.name} as ${guestName}`}
                onClick={() => onRsvp("confirmed")}
              />
              <RsvpChoiceButton
                selected={declined}
                pulse={pulse && declined}
                disabled={busy}
                variant="decline"
                label="Sadly Declining"
                ariaLabel={`Decline invitation to ${event.name} as ${guestName}`}
                onClick={() => onRsvp("declined")}
              />
            </div>

            {(confirmed || declined) && (
              <motion.p
                key={`${event.id}-${status}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-maroon/60"
              >
                {confirmed
                  ? `Shukriya — see you at ${event.name}!`
                  : "We'll miss you, but we appreciate your response."}
              </motion.p>
            )}

            {lastUpdated ? (
              <p className="text-center text-[11px] text-maroon/40">
                Last updated {lastUpdated}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </motion.article>
  )
}

function RsvpChoiceButton({
  selected,
  pulse,
  disabled,
  variant,
  label,
  ariaLabel,
  onClick,
}: {
  selected: boolean
  pulse: boolean
  disabled: boolean
  variant: "accept" | "decline"
  label: string
  ariaLabel: string
  onClick: () => void
}) {
  const acceptSelected =
    "bg-maroon text-ivory ring-2 ring-gold/50 ring-offset-2 ring-offset-ivory shadow-md"
  const acceptIdle =
    "border border-maroon/25 bg-white text-maroon-dark hover:bg-maroon/5"
  const declineSelected =
    "border-2 border-maroon/40 bg-maroon/10 text-maroon-dark ring-2 ring-maroon/20 ring-offset-2 ring-offset-ivory"
  const declineIdle =
    "border border-maroon/20 bg-white text-maroon/70 hover:border-maroon/30 hover:bg-maroon/5"

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      animate={pulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`relative min-h-12 flex-1 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-maroon/30 disabled:opacity-60 sm:min-h-11 sm:text-sm sm:py-3 ${
        variant === "accept"
          ? selected
            ? acceptSelected
            : acceptIdle
          : selected
            ? declineSelected
            : declineIdle
      }`}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {selected ? (
          <motion.svg
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : null}
        {label}
      </span>
    </motion.button>
  )
}

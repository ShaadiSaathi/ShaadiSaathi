"use client"

import { useMemo, useState } from "react"
import Avatar from "@/components/shaadi-saathi/app/Avatar"
import EmptyState from "@/components/shaadi-saathi/app/EmptyState"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import RsvpBadge from "@/components/shaadi-saathi/app/RsvpBadge"
import ConfirmOverrideDialog from "@/components/shaadi-saathi/guests/ConfirmOverrideDialog"
import EditableStatusPill from "@/components/shaadi-saathi/guests/EditableStatusPill"
import InviteLinkModal from "@/components/shaadi-saathi/guests/InviteLinkModal"
import RsvpSourceIndicator from "@/components/shaadi-saathi/guests/RsvpSourceIndicator"
import WeddingInviteLinkButton from "@/components/shaadi-saathi/guests/WeddingInviteLinkButton"
import UpgradePromptBanner from "@/components/shaadi-saathi/premium/UpgradePromptBanner"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import {
  EVENTS,
  type EventId,
  type Guest,
  type RsvpStatus,
  getRsvpSummary,
} from "@/lib/mockData"
import { FREE_LIMITS } from "@/lib/premium"

type Tab = "all" | "rsvp"

interface PendingOverride {
  guestId: string
  guestName: string
  eventId: EventId
  eventName: string
  currentStatus: RsvpStatus
  newStatus: RsvpStatus
}

export default function GuestsPage() {
  const { guests, addGuest, updateRsvpByOrganiser } = useGuests()
  const { isFamilyPremium } = usePremium()
  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [eventFilter, setEventFilter] = useState<EventId | "all">("all")
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | "all">("all")
  const [rsvpEvent, setRsvpEvent] = useState<EventId>("mehndi")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEvents, setNewEvents] = useState<EventId[]>(["walima"])
  const [inviteGuest, setInviteGuest] = useState<Guest | null>(null)
  const [pendingOverride, setPendingOverride] = useState<PendingOverride | null>(null)
  const [showGuestLimit, setShowGuestLimit] = useState(false)

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchesSearch = guest.name.toLowerCase().includes(search.toLowerCase())
      const matchesEvent =
        eventFilter === "all" || guest.events.includes(eventFilter)
      const matchesRsvp =
        rsvpFilter === "all" ||
        guest.events.some((e) => guest.rsvp[e] === rsvpFilter)
      return matchesSearch && matchesEvent && matchesRsvp
    })
  }, [guests, search, eventFilter, rsvpFilter])

  const rsvpSummary = getRsvpSummary(rsvpEvent, guests)
  const rsvpGuests = guests.filter((g) => g.events.includes(rsvpEvent))

  function handleAddGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    if (!isFamilyPremium && guests.length >= FREE_LIMITS.maxGuests) {
      setShowGuestLimit(true)
      return
    }
    addGuest({ name: newName.trim(), events: newEvents })
    setNewName("")
    setShowAddForm(false)
    setShowGuestLimit(false)
  }

  function toggleNewEvent(eventId: EventId) {
    setNewEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  function requestStatusChange(
    guest: Guest,
    eventId: EventId,
    newStatus: RsvpStatus
  ) {
    const currentStatus = guest.rsvp[eventId]
    if (!currentStatus || currentStatus === newStatus) return

    const source = guest.rsvpSource[eventId]
    const guestSetStatus =
      source === "guest" &&
      (currentStatus === "confirmed" || currentStatus === "declined")

    if (guestSetStatus) {
      setPendingOverride({
        guestId: guest.id,
        guestName: guest.name,
        eventId,
        eventName: EVENTS.find((e) => e.id === eventId)!.name,
        currentStatus,
        newStatus,
      })
      return
    }

    updateRsvpByOrganiser(guest.id, eventId, newStatus)
  }

  function confirmOverride() {
    if (!pendingOverride) return
    updateRsvpByOrganiser(
      pendingOverride.guestId,
      pendingOverride.eventId,
      pendingOverride.newStatus
    )
    setPendingOverride(null)
  }

  const totalPct =
    rsvpSummary.total > 0
      ? Math.round((rsvpSummary.confirmed / rsvpSummary.total) * 100)
      : 0

  return (
    <PageTransition>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            Guests
          </h1>
          <p className="mt-1 text-maroon/60">
            Your elegant guest register — one list, tagged per event.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WeddingInviteLinkButton />
          <GoldButton
            onClick={() => {
              if (!isFamilyPremium && guests.length >= FREE_LIMITS.maxGuests) {
                setShowGuestLimit(true)
                return
              }
              setShowAddForm(true)
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Guest
          </GoldButton>
        </div>
      </header>

      {showGuestLimit && (
        <div className="mb-6">
          <UpgradePromptBanner
            message="Upgrade to Premium to add unlimited guests to your wedding list."
            onDismiss={() => setShowGuestLimit(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gold/20 bg-white p-1">
        {(["all", "rsvp"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-maroon text-ivory" : "text-maroon/60 hover:text-maroon"
            }`}
          >
            {t === "all" ? "All Guests" : "RSVP Overview"}
          </button>
        ))}
      </div>

      {tab === "rsvp" ? (
        <RsvpOverview
          rsvpEvent={rsvpEvent}
          setRsvpEvent={setRsvpEvent}
          summary={rsvpSummary}
          totalPct={totalPct}
          guests={rsvpGuests}
          onStatusChange={requestStatusChange}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="guest-search">
              Search guests
            </label>
            <input
              id="guest-search"
              type="search"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm text-maroon-dark placeholder:text-maroon/40 focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
            />
            <select
              aria-label="Filter by event"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value as EventId | "all")}
              className="rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm text-maroon-dark focus:border-maroon/30 focus:outline-none"
            >
              <option value="all">All events</option>
              {EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by RSVP status"
              value={rsvpFilter}
              onChange={(e) => setRsvpFilter(e.target.value as RsvpStatus | "all")}
              className="rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm text-maroon-dark focus:border-maroon/30 focus:outline-none"
            >
              <option value="all">All RSVPs</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filteredGuests.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              title="No guests found"
              description="Try adjusting your filters, or add your first guest to get started."
              action={
                <GoldButton
                  onClick={() => {
                    if (!isFamilyPremium && guests.length >= FREE_LIMITS.maxGuests) {
                      setShowGuestLimit(true)
                      return
                    }
                    setShowAddForm(true)
                  }}
                >
                  Add Guest
                </GoldButton>
              }
            />
          ) : (
            <ul className="space-y-2" role="list">
              {filteredGuests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  onStatusChange={requestStatusChange}
                  onSendInvite={() => setInviteGuest(guest)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {inviteGuest && (
        <InviteLinkModal
          guestName={inviteGuest.name}
          inviteToken={inviteGuest.inviteToken}
          onClose={() => setInviteGuest(null)}
        />
      )}

      {pendingOverride && (
        <ConfirmOverrideDialog
          guestName={pendingOverride.guestName}
          eventName={pendingOverride.eventName}
          currentStatus={pendingOverride.currentStatus}
          newStatus={pendingOverride.newStatus}
          onConfirm={confirmOverride}
          onCancel={() => setPendingOverride(null)}
        />
      )}

      {/* Add guest modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
          role="dialog"
          aria-labelledby="add-guest-title"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl">
            <h2 id="add-guest-title" className="font-display text-xl font-semibold text-maroon-dark">
              Add Guest
            </h2>
            <form onSubmit={handleAddGuest} className="mt-4 space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-maroon/70">
                  Full name
                </label>
                <input
                  id="guest-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
                  placeholder="e.g. Fatima Khan"
                />
              </div>
              <fieldset>
                <legend className="text-sm font-medium text-maroon/70">Invite to events</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EVENTS.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => toggleNewEvent(ev.id)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        newEvents.includes(ev.id)
                          ? "bg-maroon text-ivory"
                          : "border border-gold/30 text-maroon/60 hover:border-gold/50"
                      }`}
                    >
                      {ev.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-3 pt-2">
                <GoldButton type="submit" className="flex-1">
                  Add Guest
                </GoldButton>
                <GoldButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1"
                >
                  Cancel
                </GoldButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  )
}

function GuestRow({
  guest,
  onStatusChange,
  onSendInvite,
}: {
  guest: Guest
  onStatusChange: (guest: Guest, eventId: EventId, status: RsvpStatus) => void
  onSendInvite: () => void
}) {
  const initials = guest.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gold/15 bg-white px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar initials={initials} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium text-maroon-dark">{guest.name}</p>
          <p className="text-sm text-maroon/50">{guest.phone}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:justify-center">
        {guest.events.map((e) => (
          <EventChip key={e} eventId={e} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {guest.events.map((e) => {
          const status = guest.rsvp[e]
          if (!status) return null
          const eventName = EVENTS.find((ev) => ev.id === e)?.name ?? e
          return (
            <div key={e} className="flex items-center gap-1 text-xs text-maroon/50">
              <span className="hidden sm:inline">{eventName}:</span>
              <EditableStatusPill
                status={status}
                eventLabel={eventName}
                guestName={guest.name}
                onChange={(newStatus) => onStatusChange(guest, e, newStatus)}
              />
              <RsvpSourceIndicator source={guest.rsvpSource[e]} />
            </div>
          )
        })}
        <button
          type="button"
          onClick={onSendInvite}
          className="ml-1 inline-flex items-center gap-1 rounded-lg border border-gold/25 px-2.5 py-1 text-xs font-medium text-maroon/70 transition-colors hover:border-gold/40 hover:bg-gold/5"
          aria-label={`Send invite link to ${guest.name}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Send Invite
        </button>
      </div>
    </li>
  )
}

function RsvpOverview({
  rsvpEvent,
  setRsvpEvent,
  summary,
  totalPct,
  guests,
  onStatusChange,
}: {
  rsvpEvent: EventId
  setRsvpEvent: (id: EventId) => void
  summary: ReturnType<typeof getRsvpSummary>
  totalPct: number
  guests: Guest[]
  onStatusChange: (guest: Guest, eventId: EventId, status: RsvpStatus) => void
}) {
  const event = EVENTS.find((e) => e.id === rsvpEvent)!

  const confirmedPct = summary.total > 0 ? (summary.confirmed / summary.total) * 100 : 0
  const pendingEnd = confirmedPct + (summary.total > 0 ? (summary.pending / summary.total) * 100 : 0)
  const declinedEnd = pendingEnd + (summary.total > 0 ? (summary.declined / summary.total) * 100 : 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {EVENTS.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => setRsvpEvent(ev.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              rsvpEvent === ev.id
                ? "bg-maroon text-ivory"
                : "border border-gold/30 text-maroon/60 hover:border-gold/50"
            }`}
          >
            {ev.name}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-gold/20 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-maroon-dark">
          {event.name} — Live headcount
        </h2>
        <p className="mt-1 text-sm text-maroon/60">
          {summary.confirmed} confirmed · {summary.pending} pending · {summary.declined} declined
          {summary.cancelled > 0 && ` · ${summary.cancelled} cancelled`}
        </p>

        <div className="mt-5 flex items-center gap-6">
          <div
            className="relative h-24 w-24 shrink-0 rounded-full"
            style={{
              background: summary.total > 0
                ? `conic-gradient(
                    #059669 0% ${confirmedPct}%,
                    #fbbf24 ${confirmedPct}% ${pendingEnd}%,
                    #fb7185 ${pendingEnd}% ${declinedEnd}%,
                    #94a3b8 ${declinedEnd}% 100%
                  )`
                : "#e5e7eb",
            }}
            role="img"
            aria-label={`${totalPct}% confirmed`}
          >
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white">
              <span className="font-display text-lg font-bold text-maroon-dark">{totalPct}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="h-3 overflow-hidden rounded-full bg-maroon/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${confirmedPct}%` }}
              />
            </div>
            <p className="text-xs text-maroon/50">
              {summary.confirmed} of {summary.total} guests confirmed for {event.name}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2" role="list">
        {guests.map((guest) => (
          <li
            key={guest.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-white px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                initials={guest.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
                size="sm"
              />
              <span className="truncate font-medium text-maroon-dark">{guest.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <EditableStatusPill
                status={guest.rsvp[rsvpEvent]}
                eventLabel={event.name}
                guestName={guest.name}
                onChange={(newStatus) => onStatusChange(guest, rsvpEvent, newStatus)}
              />
              <RsvpSourceIndicator source={guest.rsvpSource[rsvpEvent]} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

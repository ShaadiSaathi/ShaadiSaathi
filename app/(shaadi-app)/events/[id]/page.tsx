"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { use, useMemo, useState } from "react"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EventBudgetSnapshot from "@/components/shaadi-saathi/events/EventBudgetSnapshot"
import EventNotes from "@/components/shaadi-saathi/events/EventNotes"
import EventRsvpLockSettings from "@/components/shaadi-saathi/events/EventRsvpLockSettings"
import EventTaskSummary from "@/components/shaadi-saathi/events/EventTaskSummary"
import EventTimeline from "@/components/shaadi-saathi/events/EventTimeline"
import EventVendorsList from "@/components/shaadi-saathi/events/EventVendorsList"
import VenueMap from "@/components/shaadi-saathi/events/VenueMap"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import { useVendorBookings } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"
import {
  loadLocalEventOverrides,
  resolveWeddingEvent,
} from "@/lib/events/rsvp-lock"
import {
  type EventId,
  formatFullDate,
  getEventById,
  getRsvpSummary,
} from "@/lib/mockData"

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

type MobileSection = "map" | "vendors" | "timeline" | "notes" | "budget"

const MOBILE_SECTIONS: { id: MobileSection; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "vendors", label: "Vendors" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes" },
  { id: "budget", label: "Budget" },
]

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params)
  const baseEvent = getEventById(id)
  const { guests } = useGuests()
  const { bookings } = useVendorBookings()
  const { isFirebaseMode } = useAuth()
  const { wedding } = useWedding()
  const [mobileSection, setMobileSection] = useState<MobileSection>("map")
  const [localTick, setLocalTick] = useState(0)

  const overrides = useMemo(() => {
    void localTick
    return isFirebaseMode ? wedding?.eventOverrides ?? {} : loadLocalEventOverrides()
  }, [isFirebaseMode, wedding?.eventOverrides, localTick])

  const event = useMemo(
    () => (baseEvent ? resolveWeddingEvent(baseEvent.id as EventId, overrides) : undefined),
    [baseEvent, overrides]
  )

  if (!baseEvent || !event) {
    notFound()
  }

  const eventId = event.id as EventId
  const summary = getRsvpSummary(eventId, guests)

  return (
    <PageTransition>
      <Link
        href="/events"
        className="mb-6 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
      >
        ← Back to events
      </Link>

      {/* 1. Event header */}
      <header className="mb-6 rounded-2xl border border-gold/20 bg-white p-5 shadow-sm sm:mb-8 sm:p-6">
        <div className="h-1 rounded-full bg-gradient-to-r from-gold/40 via-gold to-gold/40" aria-hidden="true" />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <EventChip eventId={eventId} size="md" />
            <h1 className="mt-3 font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
              {event.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-maroon/70 sm:text-base">{event.description}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-maroon/50">Date</dt>
            <dd className="mt-1 text-sm font-medium text-maroon-dark">
              {formatFullDate(event.date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-maroon/50">Time</dt>
            <dd className="mt-1 text-sm font-medium text-maroon-dark">{event.time}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-maroon/50">RSVP</dt>
            <dd className="mt-1 text-sm font-medium text-maroon-dark">
              {summary.confirmed} confirmed · {summary.pending} pending
            </dd>
          </div>
        </dl>
      </header>

      <div className="mb-6 sm:mb-8">
        <EventRsvpLockSettings eventId={eventId} onSaved={() => setLocalTick((n) => n + 1)} />
      </div>

      {/* Mobile: tabbed sections */}
      <div className="md:hidden">
        <div
          className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gold/15 bg-ivory/95 px-4 backdrop-blur sm:-mx-6 sm:px-6"
          role="tablist"
          aria-label="Event sections"
        >
          <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MOBILE_SECTIONS.map((section) => {
              const selected = mobileSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  id={`event-tab-${section.id}`}
                  aria-controls={`event-panel-${section.id}`}
                  onClick={() => setMobileSection(section.id)}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-t-lg px-4 text-sm font-medium transition-colors ${
                    selected
                      ? "border-b-2 border-maroon text-maroon-dark"
                      : "text-maroon/55 hover:text-maroon"
                  }`}
                >
                  {section.label}
                </button>
              )
            })}
          </div>
        </div>

        <div
          id={`event-panel-${mobileSection}`}
          role="tabpanel"
          aria-labelledby={`event-tab-${mobileSection}`}
          className="space-y-4"
        >
          {mobileSection === "map" && (
            <VenueMap event={event} confirmedGuestCount={summary.confirmed} />
          )}
          {mobileSection === "vendors" && (
            <EventVendorsList eventId={eventId} eventName={event.name} bookings={bookings} />
          )}
          {mobileSection === "timeline" && (
            <>
              <EventTimeline eventId={eventId} />
              <EventTaskSummary eventId={eventId} eventName={event.name} />
            </>
          )}
          {mobileSection === "notes" && <EventNotes eventId={eventId} />}
          {mobileSection === "budget" && (
            <EventBudgetSnapshot event={event} bookings={bookings} />
          )}
        </div>
      </div>

      {/* Desktop: full stacked layout */}
      <div className="hidden space-y-6 md:block">
        {/* 2. Venue + map */}
        <VenueMap event={event} confirmedGuestCount={summary.confirmed} />

        {/* 3. Vendors hired */}
        <EventVendorsList eventId={eventId} eventName={event.name} bookings={bookings} />

        {/* 4. Day-of timeline */}
        <EventTimeline eventId={eventId} />

        {/* 5. Task summary */}
        <EventTaskSummary eventId={eventId} eventName={event.name} />

        {/* 6. Notes & mood board */}
        <EventNotes eventId={eventId} />

        {/* 7. Budget snapshot */}
        <EventBudgetSnapshot event={event} bookings={bookings} />
      </div>
    </PageTransition>
  )
}

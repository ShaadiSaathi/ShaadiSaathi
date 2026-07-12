"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { use } from "react"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EventBudgetSnapshot from "@/components/shaadi-saathi/events/EventBudgetSnapshot"
import EventNotes from "@/components/shaadi-saathi/events/EventNotes"
import EventTaskSummary from "@/components/shaadi-saathi/events/EventTaskSummary"
import EventTimeline from "@/components/shaadi-saathi/events/EventTimeline"
import EventVendorsList from "@/components/shaadi-saathi/events/EventVendorsList"
import VenueMap from "@/components/shaadi-saathi/events/VenueMap"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import { useVendorBookings } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"
import {
  type EventId,
  formatFullDate,
  getEventById,
  getRsvpSummary,
} from "@/lib/mockData"

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params)
  const event = getEventById(id)
  const { guests } = useGuests()
  const { bookings } = useVendorBookings()

  if (!event) {
    notFound()
  }

  const eventId = event.id as EventId
  const summary = getRsvpSummary(eventId, guests)

  return (
    <PageTransition>
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
      >
        ← Back to events
      </Link>

      {/* 1. Event header */}
      <header className="mb-8 rounded-2xl border border-gold/20 bg-white p-6 shadow-sm">
        <div className="h-1 rounded-full bg-gradient-to-r from-gold/40 via-gold to-gold/40" aria-hidden="true" />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <EventChip eventId={eventId} size="md" />
            <h1 className="mt-3 font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
              {event.name}
            </h1>
            <p className="mt-2 text-maroon/70">{event.description}</p>
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

      <div className="space-y-6">
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

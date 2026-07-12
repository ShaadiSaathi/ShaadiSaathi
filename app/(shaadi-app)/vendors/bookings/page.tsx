"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import MyBookings from "@/components/shaadi-saathi/vendors/MyBookings"
import { useVendorBookings } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"
import { EVENTS, type EventId } from "@/lib/mockData"

function VendorBookingsContent() {
  const { bookings } = useVendorBookings()
  const searchParams = useSearchParams()
  const eventParam = searchParams.get("event")
  const highlightId = searchParams.get("highlight")
  const eventFilter = EVENTS.find((e) => e.id === eventParam)?.id as EventId | undefined

  const [groupBy, setGroupBy] = useState<"event" | "status">("event")

  const filteredBookings = useMemo(
    () =>
      eventFilter ? bookings.filter((b) => b.eventId === eventFilter) : bookings,
    [bookings, eventFilter]
  )

  useEffect(() => {
    if (!highlightId) return
    const el = document.getElementById(`booking-${highlightId}`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlightId, filteredBookings])

  return (
    <PageTransition>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/vendors"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
          >
            ← Browse vendors
          </Link>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            My Bookings
          </h1>
          <p className="mt-1 text-maroon/60">
            Vendors you&apos;ve requested or confirmed across your events.
          </p>
        </div>
      </header>

      {eventFilter && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
          <span className="text-sm text-maroon/70">Bookings for</span>
          <EventChip eventId={eventFilter} size="sm" />
          <Link
            href="/vendors/bookings"
            className="ml-auto text-xs font-medium text-maroon/50 hover:text-maroon"
          >
            Show all bookings
          </Link>
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-xl border border-gold/20 bg-white p-1">
        {(["event", "status"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              groupBy === g ? "bg-maroon text-ivory" : "text-maroon/60 hover:text-maroon"
            }`}
          >
            Group by {g === "event" ? "Event" : "Status"}
          </button>
        ))}
      </div>

      <MyBookings
        bookings={filteredBookings}
        groupBy={groupBy}
        highlightId={highlightId ?? undefined}
      />
    </PageTransition>
  )
}

export default function VendorBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-maroon/50">
          Loading bookings…
        </div>
      }
    >
      <VendorBookingsContent />
    </Suspense>
  )
}

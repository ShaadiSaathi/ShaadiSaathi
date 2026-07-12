"use client"

import { formatPrice, getEventBookingSpend, type VendorBooking } from "@/lib/mockVendors"
import type { EventId, WeddingEvent } from "@/lib/mockData"

interface EventBudgetSnapshotProps {
  event: WeddingEvent
  bookings: VendorBooking[]
}

export default function EventBudgetSnapshot({ event, bookings }: EventBudgetSnapshotProps) {
  const spent = getEventBookingSpend(event.id as EventId, bookings)
  const target = event.budgetTarget
  const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0
  const overBudget = spent > target

  return (
    <section
      aria-labelledby="event-budget-heading"
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
    >
      <h2 id="event-budget-heading" className="font-display text-lg font-semibold text-maroon-dark">
        Budget Snapshot
      </h2>
      <p className="mt-0.5 text-sm text-maroon/60">
        Vendor spend for {event.name} — confirmed and pending bookings
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold text-maroon-dark">
            {formatPrice(spent)}
          </p>
          <p className="text-xs text-maroon/50">of {formatPrice(target)} budget</p>
        </div>
        <p
          className={`text-sm font-semibold ${
            overBudget ? "text-rose-600" : pct >= 80 ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {pct}% used
        </p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-maroon/10">
        <div
          className={`h-full rounded-full transition-all ${
            overBudget ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% of vendor budget used`}
        />
      </div>

      {overBudget && (
        <p className="mt-2 text-xs text-rose-600">
          Over budget by {formatPrice(spent - target)} — review pending bookings.
        </p>
      )}
    </section>
  )
}

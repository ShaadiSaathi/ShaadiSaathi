"use client"

import Link from "next/link"
import CategoryIcon from "@/components/shaadi-saathi/vendors/CategoryIcon"
import EmptyState from "@/components/shaadi-saathi/app/EmptyState"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import {
  DepositStatusBadge,
  BalanceStatusBadge,
} from "@/components/shaadi-saathi/vendors/payments/PaymentStatusBadges"
import type { EventId } from "@/lib/mockData"
import { EVENT_VENDOR_CATEGORIES } from "@/lib/mockData"
import {
  formatPrice,
  getCategoryById,
  getVendorById,
  type VendorBooking,
} from "@/lib/mockVendors"

const STATUS_STYLES = {
  requested: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  declined: "bg-rose-50 text-rose-800 border-rose-200",
  no_show: "bg-rose-50 text-rose-800 border-rose-200",
} as const

const STATUS_LABELS = {
  requested: "Requested",
  confirmed: "Confirmed",
  declined: "Declined",
  no_show: "No-show",
} as const

interface EventVendorsListProps {
  eventId: EventId
  eventName: string
  bookings: VendorBooking[]
}

export default function EventVendorsList({
  eventId,
  eventName,
  bookings,
}: EventVendorsListProps) {
  const eventBookings = bookings.filter((b) => b.eventId === eventId)
  const browseUrl = `/vendors?event=${eventId}`

  if (eventBookings.length === 0) {
    return (
      <section
        aria-labelledby="event-vendors-heading"
        className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
      >
        <h2 id="event-vendors-heading" className="font-display text-lg font-semibold text-maroon-dark sm:text-xl">
          Vendors for {eventName}
        </h2>
        <div className="mt-4">
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            }
            title="No vendors booked yet"
            description={`Find caterers, photographers, and more for your ${eventName.toLowerCase()} — all in one place.`}
            action={
              <Link href={browseUrl}>
                <GoldButton>Browse Vendors for this Event</GoldButton>
              </Link>
            }
          />
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="event-vendors-heading"
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="event-vendors-heading" className="font-display text-lg font-semibold text-maroon-dark sm:text-xl">
          Vendors for {eventName}
        </h2>
        <Link
          href={`/vendors/bookings?event=${eventId}`}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-gold-dark hover:underline"
        >
          View all bookings →
        </Link>
      </div>

      <ul className="space-y-2" role="list">
        {eventBookings.map((booking) => {
          const vendor = getVendorById(booking.vendorId)
          const category = vendor ? getCategoryById(vendor.categoryId) : undefined
          if (!vendor) return null

          return (
            <li key={booking.id}>
              <Link
                href={`/vendors/bookings?event=${eventId}&highlight=${booking.id}`}
                className="flex items-center gap-3 rounded-xl border border-gold/10 bg-ivory/50 p-4 transition-colors hover:border-gold/25 hover:bg-white"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${vendor.coverGradient} text-maroon/70`}
                  aria-hidden="true"
                >
                  <CategoryIcon categoryId={vendor.categoryId} className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-maroon-dark">{vendor.name}</p>
                  <p className="text-xs text-maroon/50">
                    {category?.shortLabel ?? vendor.categoryId}
                    {booking.packageName ? ` · ${booking.packageName}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[booking.status]}`}
                    >
                      {STATUS_LABELS[booking.status]}
                    </span>
                    {booking.payment?.depositStatus && (
                      <DepositStatusBadge status={booking.payment.depositStatus} />
                    )}
                    {booking.payment?.balanceStatus && (
                      <BalanceStatusBadge payment={booking.payment} />
                    )}
                  </div>
                </div>

                <p className="shrink-0 text-sm font-semibold text-maroon-dark">
                  {formatPrice(booking.price)}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-xs text-maroon/40">
        Suggested categories:{" "}
        {EVENT_VENDOR_CATEGORIES[eventId]
          .map((id) => getCategoryById(id)?.shortLabel)
          .filter(Boolean)
          .join(", ")}
      </p>
    </section>
  )
}

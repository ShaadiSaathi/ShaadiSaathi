"use client"

import Link from "next/link"
import { useState } from "react"
import CategoryIcon from "./CategoryIcon"
import CounterOfferPanel from "./CounterOfferPanel"
import type { VendorBooking } from "@/lib/mockVendors"
import {
  formatPrice,
  getCategoryById,
  getVendorById,
} from "@/lib/mockVendors"
import { EVENTS } from "@/lib/mockData"
import {
  isCheckInAvailable,
  isDisputeEligible,
  isGracePeriodActive,
  MOCK_NOW,
} from "@/lib/mockPayments"
import EmptyState from "@/components/shaadi-saathi/shared/EmptyState"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import CheckInButton, { GracePeriodBanner } from "./payments/CheckInButton"
import DepositBalanceCard from "./payments/DepositBalanceCard"
import DisputeForm, { DisputeUnderReviewCard } from "./payments/DisputeForm"
import NoShowState from "./payments/NoShowState"
import {
  BalanceStatusBadge,
  DepositStatusBadge,
  DisputeBadge,
  PaymentPathBadge,
} from "./payments/PaymentStatusBadges"
import QualityConcernForm, {
  QualityConcernBadge,
  QualityConcernCard,
} from "@/components/shaadi-saathi/shared/QualityConcernForm"
import MessageThread from "@/components/shaadi-saathi/shared/MessageThread"
import { useVendorBookings } from "./VendorBookingsContext"

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

interface MyBookingsProps {
  bookings: VendorBooking[]
  groupBy: "event" | "status"
  highlightId?: string
}

export default function MyBookings({ bookings, groupBy, highlightId }: MyBookingsProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
          </svg>
        }
        title="No vendor bookings yet"
        description="Browse our curated directory of caterers, photographers, mehndi artists, and more — all the vendors your shaadi needs."
        action={
          <Link href="/vendors">
            <GoldButton>Browse vendors</GoldButton>
          </Link>
        }
      />
    )
  }

  if (groupBy === "event") {
    return (
      <div className="space-y-8">
        {EVENTS.map((event) => {
          const eventBookings = bookings.filter((b) => b.eventId === event.id)
          if (eventBookings.length === 0) return null
          return (
            <section key={event.id} aria-labelledby={`bookings-${event.id}`}>
              <h2
                id={`bookings-${event.id}`}
                className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-maroon/50"
              >
                {event.name}
              </h2>
              <ul className="space-y-3">
                {eventBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} highlighted={b.id === highlightId} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    )
  }

  const statuses = ["requested", "confirmed", "no_show", "declined"] as const
  return (
    <div className="space-y-8">
      {statuses.map((status) => {
        const group = bookings.filter((b) => b.status === status)
        if (group.length === 0) return null
        return (
          <section key={status} aria-labelledby={`bookings-status-${status}`}>
            <h2
              id={`bookings-status-${status}`}
              className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-maroon/50"
            >
              {STATUS_LABELS[status]}
            </h2>
            <ul className="space-y-3">
              {group.map((b) => (
                <BookingCard key={b.id} booking={b} highlighted={b.id === highlightId} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function BookingCard({
  booking,
  highlighted = false,
}: {
  booking: VendorBooking
  highlighted?: boolean
}) {
  const {
    vendorCheckIn,
    markBalancePaid,
    submitDispute,
    reportQualityConcern,
    acceptCounterOffer,
    declineCounterOffer,
    proposeFamilyCounter,
  } = useVendorBookings()
  const [showDispute, setShowDispute] = useState(false)
  const [showQualityConcern, setShowQualityConcern] = useState(false)

  const vendor = getVendorById(booking.vendorId)
  const category = vendor ? getCategoryById(vendor.categoryId) : null
  const event = EVENTS.find((e) => e.id === booking.eventId)
  const payment = booking.payment

  if (!vendor) return null

  const isCompleted =
    payment?.balanceStatus === "paid_in_person" ||
    payment?.balanceStatus === "released_online"

  const checkInOpen =
    payment && booking.status === "confirmed"
      ? isCheckInAvailable(payment, booking.eventId, MOCK_NOW)
      : false
  const graceActive =
    payment && booking.status === "confirmed"
      ? isGracePeriodActive(payment, MOCK_NOW)
      : false
  const disputeEligible =
    payment && booking.status === "confirmed"
      ? isDisputeEligible(payment, booking.eventId, MOCK_NOW)
      : false
  const canReportQuality =
    payment &&
    booking.status === "confirmed" &&
    !payment.qualityConcern &&
    (graceActive || checkInOpen || !!payment.checkInAt)

  return (
    <li
      id={`booking-${booking.id}`}
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        highlighted ? "border-gold ring-2 ring-gold/30" : "border-gold/15"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-dark">
            <CategoryIcon categoryId={vendor.categoryId} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/vendors/${vendor.id}`}
              className="truncate font-medium text-maroon-dark hover:text-maroon hover:underline"
            >
              {vendor.name}
            </Link>
            <p className="text-xs text-maroon/50">
              {category?.label} · {event?.name}
              {booking.packageName && ` · ${booking.packageName}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-maroon-dark">{formatPrice(booking.price)}</p>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[booking.status]}`}
          >
            {STATUS_LABELS[booking.status]}
          </span>
        </div>
      </div>

      {booking.counterOffer?.proposedBy === "vendor" && booking.status === "requested" && (
        <div className="mt-4">
          <CounterOfferPanel
            booking={booking}
            vendorName={vendor.name}
            onAccept={() => acceptCounterOffer(booking.id)}
            onDecline={() => declineCounterOffer(booking.id)}
            onCounter={(price, note) => proposeFamilyCounter(booking.id, { price, note })}
          />
        </div>
      )}

      {payment && booking.status !== "no_show" && (
        <div className="mt-4 space-y-3 border-t border-gold/10 pt-4">
          <div className="flex flex-wrap gap-2">
            <DepositStatusBadge status={payment.depositStatus} />
            <BalanceStatusBadge payment={payment} />
            <PaymentPathBadge payment={payment} />
            {payment.qualityConcern && <QualityConcernBadge />}
            {payment.dispute?.status === "under_review" && <DisputeBadge />}
          </div>

          <DepositBalanceCard payment={payment} compact />

          {payment.qualityConcern && (
            <QualityConcernCard description={payment.qualityConcern.description} />
          )}

          {payment.paymentPath === "in_person" &&
            payment.balanceStatus === "due_in_person" &&
            payment.depositStatus === "released" && (
              <p className="text-xs text-maroon/60">
                Balance due on the day: {formatPrice(payment.balanceAmount)}
              </p>
            )}

          {graceActive && payment.gracePeriodEndsAt && (
            <GracePeriodBanner endsAt={payment.gracePeriodEndsAt} />
          )}

          {checkInOpen && (
            <CheckInButton
              onCheckIn={(photo) => vendorCheckIn(booking.id, photo)}
              checkedIn={!!payment.checkInAt}
              checkedInAt={payment.checkInAt}
              checkInPhoto={payment.checkInPhoto}
            />
          )}

          {canReportQuality && (
            <button
              type="button"
              onClick={() => setShowQualityConcern(true)}
              className="text-xs font-medium text-violet-800 underline-offset-2 hover:underline"
            >
              Something&apos;s wrong with the setup
            </button>
          )}

          {payment.paymentPath === "in_person" &&
            payment.balanceStatus === "due_in_person" &&
            payment.depositStatus === "released" && (
              <GoldButton
                variant="ghost"
                onClick={() => markBalancePaid(booking.id)}
                className="text-xs"
              >
                Mark balance as paid
              </GoldButton>
            )}

          {payment.dispute?.status === "under_review" && (
            <DisputeUnderReviewCard vendorName={vendor.name} />
          )}

          {disputeEligible && payment.dispute?.status !== "under_review" && !payment.qualityConcern && (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="text-xs font-medium text-maroon/60 underline-offset-2 hover:text-maroon hover:underline"
            >
              Report an issue (formal dispute)
            </button>
          )}

          {booking.status !== "declined" && (
            <Link
              href={`/vendors/bookings/${booking.id}/messages`}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-maroon hover:text-gold-dark"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Message vendor
            </Link>
          )}

          {payment.messages && payment.messages.length > 0 && (
            <MessageThread messages={payment.messages} />
          )}
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 border-t border-gold/10 pt-4">
          <Link href={`/vendors/${vendor.id}?rebook=1`}>
            <GoldButton variant="ghost" className="text-xs">
              Book this vendor again
            </GoldButton>
          </Link>
        </div>
      )}

      {booking.status === "no_show" && <NoShowState booking={booking} />}

      {showDispute && (
        <DisputeForm
          vendorName={vendor.name}
          onSubmit={(data) => {
            submitDispute(booking.id, data)
            setShowDispute(false)
          }}
          onClose={() => setShowDispute(false)}
        />
      )}

      {showQualityConcern && (
        <QualityConcernForm
          onSubmit={(data) => reportQualityConcern(booking.id, data)}
          onClose={() => setShowQualityConcern(false)}
        />
      )}
    </li>
  )
}

"use client"

import {
  getBookingPayoutVisibility,
  type VendorPayoutStatus,
} from "@/lib/vendor-earnings"
import type { BookingPayment } from "@/lib/mockPayments"
import type { VendorJobStatus } from "@/lib/mockVendorPortal"

/** Compact vendor payout / earnings status badge for job lists and detail. */
export function VendorPayoutStatusBadge({
  payment,
  jobStatus,
}: {
  payment: BookingPayment
  jobStatus?: VendorJobStatus
}) {
  const visibility = getBookingPayoutVisibility(payment, jobStatus)
  if (visibility.status === "none") return null

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${visibility.style}`}
      title={visibility.detail}
    >
      <span className="truncate">{visibility.label}</span>
    </span>
  )
}

export function vendorPayoutStatusShortLabel(status: VendorPayoutStatus): string {
  switch (status) {
    case "owed":
      return "Owed"
    case "pending":
      return "Pending"
    case "paid":
      return "Paid"
    case "on_hold":
      return "On hold"
    case "refunded":
      return "Refunded"
    default:
      return ""
  }
}

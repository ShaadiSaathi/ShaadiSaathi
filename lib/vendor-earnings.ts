/**
 * Vendor earnings visibility — derived from existing booking.payment fields.
 *
 * Does NOT send money. Safepay bank payouts are not live yet; amounts in
 * "owed" / "pending" are tracked for when payouts activate.
 */

import type { BookingPayment } from "@/lib/mockPayments"
import type { VendorJob, VendorJobStatus } from "@/lib/mockVendorPortal"

/**
 * Vendor-facing payout bucket on a booking (denormalized alias of deposit /
 * balance / safepay state). Stored optionally as `payment.payoutStatus` when
 * present; otherwise always derivable via {@link deriveVendorPayoutStatus}.
 */
export type VendorPayoutStatus =
  | "owed"
  | "pending"
  | "paid"
  | "on_hold"
  | "refunded"
  | "none"

export const VENDOR_PAYOUT_STATUS_STYLES: Record<VendorPayoutStatus, string> = {
  owed: "bg-amber-50 text-amber-950 border-amber-200",
  pending: "bg-sky-50 text-sky-950 border-sky-200",
  paid: "bg-emerald-50 text-emerald-900 border-emerald-200",
  on_hold: "bg-rose-50 text-rose-900 border-rose-200",
  refunded: "bg-maroon/8 text-maroon/70 border-maroon/15",
  none: "bg-maroon/5 text-maroon/50 border-maroon/10",
}

export interface BookingPayoutVisibility {
  status: VendorPayoutStatus
  /** Short badge label, e.g. "Pending — releases after check-in" */
  label: string
  detail: string
  style: string
  /** Amount attributed to this booking's primary status bucket */
  amountPkr: number
  /** True when money is tracked but has not been sent to the vendor's bank */
  awaitingBankPayout: boolean
}

export interface VendorEarningsSummary {
  owedPkr: number
  pendingPkr: number
  paidPkr: number
  /** Bookings with any money movement, newest event date first */
  paidBreakdown: Array<{
    jobId: string
    familyName: string
    weddingName: string
    eventName: string
    eventDate: string
    amountPkr: number
    paidAtLabel: string
    note: string
  }>
  /** True until Safepay has actually settled at least one payout (or forever while offline) */
  bankPayoutsActive: boolean
}

function isBankSettled(payment: BookingPayment): boolean {
  return payment.safepayPayoutStatus === "P_SETTLED"
}

function isPayoutInFlight(payment: BookingPayment): boolean {
  const sp = payment.safepayPayoutStatus
  return sp === "P_INITIATED" || sp === "P_RECEIVED"
}

function hasOpenDispute(
  payment: BookingPayment,
  jobStatus?: VendorJobStatus
): boolean {
  return (
    jobStatus === "disputed" || payment.dispute?.status === "under_review"
  )
}

function formatReleaseHint(payment: BookingPayment): string | null {
  if (payment.depositStatus !== "held") return null
  if (payment.gracePeriodEndsAt) {
    const d = new Date(payment.gracePeriodEndsAt)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }
  if (payment.scheduledArrivalAt) {
    const d = new Date(payment.scheduledArrivalAt)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }
  return null
}

/** Derive vendor-facing payoutStatus from existing payment + job fields. */
export function deriveVendorPayoutStatus(
  payment: BookingPayment | undefined | null,
  jobStatus?: VendorJobStatus
): VendorPayoutStatus {
  if (!payment) return "none"

  if (hasOpenDispute(payment, jobStatus)) return "on_hold"

  if (payment.depositStatus === "refunded") {
    // In-person balance already with vendor still counts as paid elsewhere;
    // primary badge for a fully refunded deposit booking is refunded.
    if (
      payment.balanceStatus === "paid_in_person" ||
      (payment.balanceStatus === "released_online" && isBankSettled(payment))
    ) {
      return "paid"
    }
    return "refunded"
  }

  if (isBankSettled(payment)) return "paid"

  // Balance already received in person on the day — counts as paid to vendor
  // for that slice; deposit may still be pending/owed.
  if (
    payment.depositStatus === "held" ||
    payment.balanceStatus === "charged_pending_release" ||
    isPayoutInFlight(payment)
  ) {
    return "pending"
  }

  if (payment.depositStatus === "released" && !isBankSettled(payment)) {
    return "owed"
  }

  if (
    payment.balanceStatus === "paid_in_person" ||
    payment.balanceStatus === "released_online"
  ) {
    // Deposit may still be held — prefer pending/owed above. If we got here,
    // deposit isn't held/released-pending, so treat as paid (in-person).
    return "paid"
  }

  return "none"
}

/**
 * Human-readable visibility for one booking — labels never claim bank transfer
 * unless Safepay has settled.
 */
export function getBookingPayoutVisibility(
  payment: BookingPayment | undefined | null,
  jobStatus?: VendorJobStatus
): BookingPayoutVisibility {
  const status =
    payment?.payoutStatus && isVendorPayoutStatus(payment.payoutStatus)
      ? payment.payoutStatus
      : deriveVendorPayoutStatus(payment, jobStatus)

  if (!payment || status === "none") {
    return {
      status: "none",
      label: "No payment yet",
      detail: "Payment details appear after the family pays a deposit.",
      style: VENDOR_PAYOUT_STATUS_STYLES.none,
      amountPkr: 0,
      awaitingBankPayout: false,
    }
  }

  const releaseDate = formatReleaseHint(payment)
  const depositAmt =
    payment.depositStatus === "refunded" ? 0 : payment.depositAmount
  const balanceCounted =
    payment.balanceStatus === "paid_in_person" ||
    payment.balanceStatus === "released_online" ||
    payment.balanceStatus === "charged_pending_release"
      ? payment.balanceAmount
      : 0

  switch (status) {
    case "on_hold":
      return {
        status,
        label: "On hold — dispute open",
        detail:
          "Funds stay with Shaadi Saathi until the dispute is resolved. This is not a bank payout.",
        style: VENDOR_PAYOUT_STATUS_STYLES.on_hold,
        amountPkr: depositAmt + (balanceCounted || 0),
        awaitingBankPayout: true,
      }
    case "pending": {
      if (isPayoutInFlight(payment)) {
        return {
          status,
          label: "Pending — payout in process",
          detail:
            "A bank transfer was started. You will see Paid here once it settles.",
          style: VENDOR_PAYOUT_STATUS_STYLES.pending,
          amountPkr: depositAmt + balanceCounted,
          awaitingBankPayout: true,
        }
      }
      if (payment.balanceStatus === "charged_pending_release") {
        return {
          status,
          label: "Pending — awaiting check-in release",
          detail:
            "Online balance is charged and held until day-of check-in. Bank payouts are not sent yet.",
          style: VENDOR_PAYOUT_STATUS_STYLES.pending,
          amountPkr: payment.balanceAmount + (payment.depositStatus === "held" ? payment.depositAmount : 0),
          awaitingBankPayout: true,
        }
      }
      return {
        status,
        label: releaseDate
          ? `Pending — releases ${releaseDate}`
          : "Pending — held until check-in",
        detail:
          "Deposit is in platform escrow. After check-in it moves to Owed until Safepay bank payouts are active — nothing has been sent to your bank yet.",
        style: VENDOR_PAYOUT_STATUS_STYLES.pending,
        amountPkr: payment.depositAmount,
        awaitingBankPayout: true,
      }
    }
    case "owed":
      return {
        status,
        label: "Owed — awaiting bank payout",
        detail:
          "This amount is owed to you once Safepay payouts are active. It has not been transferred to your bank yet.",
        style: VENDOR_PAYOUT_STATUS_STYLES.owed,
        amountPkr: payment.depositAmount,
        awaitingBankPayout: true,
      }
    case "paid": {
      const inPersonOnly =
        payment.balanceStatus === "paid_in_person" && !isBankSettled(payment)
      return {
        status,
        label: inPersonOnly ? "Paid — received in person" : "Paid",
        detail: isBankSettled(payment)
          ? "Marked paid after a completed bank payout."
          : "Balance marked paid in person on the day. Platform escrow deposits still follow the Owed / Pending flow until Safepay is live.",
        style: VENDOR_PAYOUT_STATUS_STYLES.paid,
        amountPkr: isBankSettled(payment)
          ? depositAmt + balanceCounted
          : payment.balanceStatus === "paid_in_person"
            ? payment.balanceAmount
            : depositAmt + balanceCounted,
        awaitingBankPayout: false,
      }
    }
    case "refunded":
      return {
        status,
        label: "Refunded",
        detail: "Deposit was returned to the family — not payable to you.",
        style: VENDOR_PAYOUT_STATUS_STYLES.refunded,
        amountPkr: 0,
        awaitingBankPayout: false,
      }
    default:
      return {
        status: "none",
        label: "No payment yet",
        detail: "",
        style: VENDOR_PAYOUT_STATUS_STYLES.none,
        amountPkr: 0,
        awaitingBankPayout: false,
      }
  }
}

function isVendorPayoutStatus(value: string): value is VendorPayoutStatus {
  return (
    value === "owed" ||
    value === "pending" ||
    value === "paid" ||
    value === "on_hold" ||
    value === "refunded" ||
    value === "none"
  )
}

/**
 * Aggregate Owed / Pending / Paid across jobs.
 * Amounts use payment pieces so one booking can contribute to multiple buckets
 * (e.g. held deposit → pending, in-person balance → paid).
 */
export function getVendorEarningsSummary(jobs: VendorJob[]): VendorEarningsSummary {
  let owedPkr = 0
  let pendingPkr = 0
  let paidPkr = 0
  let bankPayoutsActive = false
  const paidBreakdown: VendorEarningsSummary["paidBreakdown"] = []

  for (const job of jobs) {
    const p = job.payment
    if (!p) continue

    if (isBankSettled(p)) bankPayoutsActive = true

    const disputed = hasOpenDispute(p, job.jobStatus)

    // Deposit
    if (p.depositStatus === "held") {
      if (disputed) {
        // on_hold rolls into pending for the summary totals (awaiting release)
        pendingPkr += p.depositAmount
      } else {
        pendingPkr += p.depositAmount
      }
    } else if (p.depositStatus === "released") {
      if (isBankSettled(p)) {
        paidPkr += p.depositAmount
      } else if (isPayoutInFlight(p) || disputed) {
        pendingPkr += p.depositAmount
      } else {
        owedPkr += p.depositAmount
      }
    }

    // Balance
    if (p.balanceStatus === "charged_pending_release") {
      pendingPkr += p.balanceAmount
    } else if (p.balanceStatus === "paid_in_person") {
      paidPkr += p.balanceAmount
      paidBreakdown.push({
        jobId: job.id,
        familyName: job.familyName,
        weddingName: job.weddingName,
        eventName: job.eventName,
        eventDate: job.eventDate,
        amountPkr: p.balanceAmount,
        paidAtLabel: (p.balanceMarkedPaidAt ?? p.balanceChargedAt ?? job.eventDate).slice(0, 10),
        note: "Received in person",
      })
    } else if (p.balanceStatus === "released_online") {
      if (isBankSettled(p)) {
        paidPkr += p.balanceAmount
      } else if (isPayoutInFlight(p) || disputed) {
        pendingPkr += p.balanceAmount
      } else {
        owedPkr += p.balanceAmount
      }
    }

    if (isBankSettled(p) && p.depositStatus === "released") {
      const settledAt =
        p.safepayPayoutAttemptedAt?.slice(0, 10) ??
        p.checkInAt?.slice(0, 10) ??
        job.eventDate
      const amount =
        p.depositAmount +
        (p.balanceStatus === "released_online" ? p.balanceAmount : 0)
      paidBreakdown.push({
        jobId: job.id,
        familyName: job.familyName,
        weddingName: job.weddingName,
        eventName: job.eventName,
        eventDate: job.eventDate,
        amountPkr: amount,
        paidAtLabel: settledAt,
        note: "Bank payout settled",
      })
    }
  }

  paidBreakdown.sort((a, b) => b.paidAtLabel.localeCompare(a.paidAtLabel))

  return {
    owedPkr,
    pendingPkr,
    paidPkr,
    paidBreakdown,
    bankPayoutsActive,
  }
}

/** Attach derived payoutStatus onto a payment object for display / future queries. */
export function withDerivedPayoutStatus(
  payment: BookingPayment,
  jobStatus?: VendorJobStatus
): BookingPayment {
  return {
    ...payment,
    payoutStatus: deriveVendorPayoutStatus(payment, jobStatus),
  }
}

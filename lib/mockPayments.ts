/**
 * Shaadi Saathi — mock payments, deposits, protections.
 * PLACEHOLDER: plug real integrations here (Safepay, JazzCash, Easypaisa, card gateway).
 */

import type { EventId } from "./mockData"
import { EVENTS } from "./mockData"

/** Demo "now" — swap for real Date in production */
export const MOCK_NOW = new Date("2026-07-11T10:00:00")

export const DEPOSIT_PERCENT_MIN = 0.25
export const DEPOSIT_PERCENT_MAX = 0.30
export const DEFAULT_DEPOSIT_PERCENT = 0.275

export const GRACE_PERIOD_HOURS = 2
export const DISPUTE_WINDOW_HOURS = 48
export const CHECK_IN_WINDOW_HOURS_BEFORE = 12

export type PaymentPath = "in_person" | "online"
export type InPersonMethod = "cash" | "card"
export type DepositStatus = "held" | "released" | "refunded"
export type BalanceStatus =
  | "due_in_person"
  | "paid_in_person"
  | "pending_online"
  | "charged_pending_release"
  | "released_online"

export type DisputeStatus = "none" | "under_review" | "resolved"
export type DisputeCategory = "quality" | "no_show" | "other"

export interface BookingDispute {
  status: DisputeStatus
  category: DisputeCategory
  description: string
  submittedAt: string
  evidenceFileName?: string
}

/** Photo proof attached at check-in — mock file picker, no real camera/GPS */
export interface CheckInPhoto {
  name: string
  previewUrl: string
  uploadedAt: string
}

export type CheckInStatus = "pending" | "confirmed" | "issue_reported"

/** Expedited same-day quality flag — distinct from formal dispute */
export interface QualityConcern {
  status: "under_review"
  description: string
  photoName?: string
  reportedAt: string
}

export interface BookingMessage {
  id: string
  sender: "family" | "vendor"
  text: string
  sentAt: string
}

export interface BookingPayment {
  totalPrice: number
  depositAmount: number
  depositPercent: number
  balanceAmount: number
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
  depositStatus: DepositStatus
  balanceStatus: BalanceStatus
  depositPaidAt?: string
  /** ISO datetime — vendor/family check-in on event day */
  checkInAt?: string
  checkInStatus?: CheckInStatus
  checkInPhoto?: CheckInPhoto
  qualityConcern?: QualityConcern
  /** In-app message thread — persists after job completes */
  messages?: BookingMessage[]
  /** Scheduled vendor arrival (event date + time parsed) */
  scheduledArrivalAt?: string
  gracePeriodEndsAt?: string
  balanceMarkedPaidAt?: string
  balanceChargedAt?: string
  dispute?: BookingDispute
  refundAmount?: number
  refundConfirmedAt?: string
}

export const PAYMENT_PROVIDERS = [
  { id: "jazzcash", label: "JazzCash", icon: "📱" },
  { id: "easypaisa", label: "Easypaisa", icon: "💚" },
  { id: "card", label: "Debit / Credit Card", icon: "💳" },
] as const

export const WEDDING_DAY_GUARANTEE = {
  title: "Shaadi Saathi Promise",
  short: "Shaadi Saathi Promise",
  description:
    "We help you find a backup vendor and support you if a vendor doesn't show up. Your deposit is held safely until they check in with photo proof on the day — and refunded automatically if they miss the grace window.",
} as const

export function calculateDepositSplit(
  totalPrice: number,
  depositPercent = DEFAULT_DEPOSIT_PERCENT
): Pick<BookingPayment, "depositAmount" | "balanceAmount" | "depositPercent" | "totalPrice"> {
  const clamped = Math.min(DEPOSIT_PERCENT_MAX, Math.max(DEPOSIT_PERCENT_MIN, depositPercent))
  const depositAmount = Math.round(totalPrice * clamped)
  const balanceAmount = totalPrice - depositAmount
  return {
    totalPrice,
    depositAmount,
    balanceAmount,
    depositPercent: clamped,
  }
}

/** Parse event date + time like "6:00 PM" into ISO arrival datetime */
export function getScheduledArrival(eventId: EventId): string {
  const event = EVENTS.find((e) => e.id === eventId)
  if (!event) return MOCK_NOW.toISOString()

  const [time, period] = event.time.split(" ")
  const [hours, minutes] = time.split(":").map(Number)
  let h = hours
  if (period === "PM" && h < 12) h += 12
  if (period === "AM" && h === 12) h = 0

  const d = new Date(event.date)
  d.setHours(h, minutes ?? 0, 0, 0)
  return d.toISOString()
}

export function getGracePeriodEnd(scheduledArrivalAt: string): string {
  const end = new Date(scheduledArrivalAt)
  end.setHours(end.getHours() + GRACE_PERIOD_HOURS)
  return end.toISOString()
}

export function createInitialPayment(
  totalPrice: number,
  paymentPath: PaymentPath,
  inPersonMethod?: InPersonMethod
): BookingPayment {
  const split = calculateDepositSplit(totalPrice)
  return {
    ...split,
    paymentPath,
    inPersonMethod: paymentPath === "in_person" ? inPersonMethod : undefined,
    depositStatus: "held",
    balanceStatus:
      paymentPath === "in_person" ? "due_in_person" : "pending_online",
    depositPaidAt: MOCK_NOW.toISOString(),
  }
}

export function enrichPaymentWithSchedule(
  payment: BookingPayment,
  eventId: EventId
): BookingPayment {
  const scheduledArrivalAt = getScheduledArrival(eventId)
  return {
    ...payment,
    scheduledArrivalAt,
    gracePeriodEndsAt: getGracePeriodEnd(scheduledArrivalAt),
  }
}

export function isCheckInAvailable(
  payment: BookingPayment,
  eventId: EventId,
  now = MOCK_NOW
): boolean {
  if (payment.checkInAt || payment.depositStatus === "refunded") return false
  const arrival = new Date(payment.scheduledArrivalAt ?? getScheduledArrival(eventId))
  const windowStart = new Date(arrival)
  windowStart.setHours(windowStart.getHours() - CHECK_IN_WINDOW_HOURS_BEFORE)
  const windowEnd = new Date(arrival)
  windowEnd.setHours(windowEnd.getHours() + GRACE_PERIOD_HOURS + 1)
  return now >= windowStart && now <= windowEnd
}

export function isGracePeriodActive(payment: BookingPayment, now = MOCK_NOW): boolean {
  if (payment.checkInAt) return false
  const arrival = new Date(payment.scheduledArrivalAt ?? "")
  const graceEnd = new Date(payment.gracePeriodEndsAt ?? "")
  return now > arrival && now < graceEnd
}

export function shouldAutoNoShow(payment: BookingPayment, now = MOCK_NOW): boolean {
  if (payment.checkInAt || payment.depositStatus === "refunded") return false
  const graceEnd = new Date(payment.gracePeriodEndsAt ?? "")
  return now >= graceEnd
}

export function isDisputeEligible(
  payment: BookingPayment,
  eventId: EventId,
  now = MOCK_NOW
): boolean {
  if (payment.dispute?.status === "under_review") return false
  const event = EVENTS.find((e) => e.id === eventId)
  if (!event) return false
  const eventEnd = new Date(event.date)
  eventEnd.setHours(23, 59, 59, 999)
  const disputeDeadline = new Date(eventEnd)
  disputeDeadline.setHours(disputeDeadline.getHours() + DISPUTE_WINDOW_HOURS)
  return now > eventEnd && now < disputeDeadline
}

export function formatPaymentPathLabel(payment: BookingPayment): string {
  if (payment.paymentPath === "online") return "Pay balance online"
  const method = payment.inPersonMethod === "card" ? "card on the day" : "cash on the day"
  return `Pay balance in person (${method})`
}

export function getDepositStatusLabel(status: DepositStatus): string {
  const labels: Record<DepositStatus, string> = {
    held: "Held",
    released: "Released",
    refunded: "Refunded",
  }
  return labels[status]
}

export function getBalanceStatusLabel(status: BalanceStatus, payment: BookingPayment): string {
  if (status === "due_in_person") return "Due in person"
  if (status === "paid_in_person") return "Paid in person"
  if (status === "pending_online") return "Due online (near event)"
  if (status === "charged_pending_release") return "Pending check-in release"
  if (status === "released_online") return "Paid online"
  return status
}

export const DEPOSIT_STATUS_STYLES: Record<DepositStatus, string> = {
  held: "bg-amber-50 text-amber-900 border-amber-200",
  released: "bg-emerald-50 text-emerald-800 border-emerald-200",
  refunded: "bg-rose-50 text-rose-800 border-rose-200",
}

export const BALANCE_STATUS_STYLES: Record<BalanceStatus, string> = {
  due_in_person: "bg-amber-50 text-amber-900 border-amber-200",
  paid_in_person: "bg-emerald-50 text-emerald-800 border-emerald-200",
  pending_online: "bg-amber-50 text-amber-900 border-amber-200",
  charged_pending_release: "bg-amber-50 text-amber-900 border-amber-200",
  released_online: "bg-emerald-50 text-emerald-800 border-emerald-200",
}

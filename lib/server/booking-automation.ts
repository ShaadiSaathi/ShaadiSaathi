/**
 * Staging-first booking automation: dispute 48h auto-resolve + no-show grace flip.
 * Invoked by Cloud Functions on a schedule and by a secret-protected HTTP route.
 */

import { FieldValue } from "firebase-admin/firestore"
import type {
  FirestoreBooking,
  FirestoreBookingDispute,
  FirestoreBookingPayment,
  NotificationType,
} from "@/lib/firebase/types"
import {
  disputeVendorResponseDeadlineAt,
  defaultArrivalTimeForEvent,
  gracePeriodEndsMs,
  scheduledArrivalMs,
} from "@/lib/automation/constants"
import { createNotificationAdmin } from "@/lib/server/notifications"
import { getAdminDb } from "@/lib/server/firebase-admin"
import {
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  refundDeposit,
} from "@/lib/payments"

export type AutomationActionType =
  | "dispute_auto_resolved"
  | "no_show_declared"
  | "refund_attempted"
  | "refund_skipped"
  | "notification_sent"

export type AutomationLogEntry = {
  id: string
  action: AutomationActionType
  bookingId: string
  weddingId?: string
  vendorId?: string
  message: string
  details?: Record<string, string | number | boolean | null>
  createdAt: number
  source: "scheduler" | "manual_trigger"
}

export type AutomationSweepResult = {
  scannedDisputes: number
  resolvedDisputes: number
  scannedNoShows: number
  declaredNoShows: number
  refundsAttempted: number
  refundsSucceeded: number
  notificationsCreated: number
  logIds: string[]
  errors: string[]
}

async function writeAutomationLog(
  entry: Omit<AutomationLogEntry, "id" | "createdAt"> & { createdAt?: number }
): Promise<string> {
  const db = getAdminDb()
  const ref = db.collection("automation_logs").doc()
  const createdAt = entry.createdAt ?? Date.now()
  const doc: AutomationLogEntry = {
    id: ref.id,
    action: entry.action,
    bookingId: entry.bookingId,
    message: entry.message,
    source: entry.source,
    createdAt,
    ...(entry.weddingId ? { weddingId: entry.weddingId } : {}),
    ...(entry.vendorId ? { vendorId: entry.vendorId } : {}),
    ...(entry.details ? { details: entry.details } : {}),
  }
  await ref.set(doc)
  return ref.id
}

async function notifyParties(input: {
  weddingId: string
  bookingId: string
  familyUid: string | null
  vendorOwnerUid: string | null
  type: NotificationType
  familyMessage: string
  vendorMessage: string
  priority?: "normal" | "urgent"
}): Promise<number> {
  let created = 0
  if (input.familyUid) {
    const id = await createNotificationAdmin({
      recipientUid: input.familyUid,
      weddingId: input.weddingId,
      type: input.type,
      message: input.familyMessage,
      bookingId: input.bookingId,
      href: `/vendors/bookings#booking-${input.bookingId}`,
      priority: input.priority,
      actorName: "Shaadi Saathi",
    })
    if (id) created += 1
  }
  if (input.vendorOwnerUid) {
    const id = await createNotificationAdmin({
      recipientUid: input.vendorOwnerUid,
      weddingId: input.weddingId,
      type: input.type,
      message: input.vendorMessage,
      bookingId: input.bookingId,
      href: `/vendor/jobs/${input.bookingId}`,
      priority: input.priority,
      actorName: "Shaadi Saathi",
    })
    if (id) created += 1
  }
  return created
}

async function resolveWeddingOwnerUid(weddingId: string): Promise<string | null> {
  const snap = await getAdminDb().collection("weddings").doc(weddingId).get()
  if (!snap.exists) return null
  const ownerId = snap.data()?.ownerId
  return typeof ownerId === "string" && ownerId ? ownerId : null
}

async function resolveVendorOwnerUid(vendorId: string): Promise<string | null> {
  const snap = await getAdminDb().collection("vendors").doc(vendorId).get()
  if (!snap.exists) return null
  const ownerUid = snap.data()?.ownerUid
  return typeof ownerUid === "string" && ownerUid ? ownerUid : null
}

async function attemptDepositRefund(
  booking: FirestoreBooking,
  reason: string,
  source: AutomationLogEntry["source"],
  logIds: string[]
): Promise<{ attempted: boolean; succeeded: boolean; amount?: number; error?: string }> {
  const payment = booking.payment
  const paymentIntentId = payment?.stripeDepositPaymentIntentId
  if (!payment || !paymentIntentId) {
    const logId = await writeAutomationLog({
      action: "refund_skipped",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: "No Stripe deposit PaymentIntent on booking — status updated without refund",
      details: { reason },
    })
    logIds.push(logId)
    return { attempted: false, succeeded: false, error: "no_payment_intent" }
  }

  if (payment.depositStatus === "refunded") {
    return { attempted: false, succeeded: false, error: "already_refunded" }
  }

  try {
    const result = await refundDeposit({
      paymentIntentId,
      bookingId: booking.id,
      reason,
    })
    const logId = await writeAutomationLog({
      action: "refund_attempted",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: `Deposit refund succeeded (${result.amountRefundedPkr} PKR)`,
      details: {
        reason,
        refundId: result.refundId,
        amountRefundedPkr: result.amountRefundedPkr,
        status: result.status,
      },
    })
    logIds.push(logId)
    return { attempted: true, succeeded: true, amount: result.amountRefundedPkr }
  } catch (err) {
    const message =
      err instanceof PaymentsNotConfiguredError || err instanceof PaymentsSafetyError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Refund failed"
    const logId = await writeAutomationLog({
      action: "refund_skipped",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: `Deposit refund skipped/failed: ${message}`,
      details: { reason },
    })
    logIds.push(logId)
    return { attempted: true, succeeded: false, error: message }
  }
}

function disputeDeadline(dispute: FirestoreBookingDispute): number {
  if (typeof dispute.vendorResponseDeadlineAt === "number") {
    return dispute.vendorResponseDeadlineAt
  }
  return disputeVendorResponseDeadlineAt(dispute.submittedAt)
}

function resolveGraceEndMs(booking: FirestoreBooking): number | null {
  const payment = booking.payment
  if (payment?.gracePeriodEndsAt && typeof payment.gracePeriodEndsAt === "number") {
    return payment.gracePeriodEndsAt
  }
  if (payment?.scheduledArrivalAt && typeof payment.scheduledArrivalAt === "number") {
    return gracePeriodEndsMs(payment.scheduledArrivalAt)
  }
  if (!booking.eventDate) return null
  const arrival = scheduledArrivalMs(
    booking.eventDate,
    defaultArrivalTimeForEvent(booking.eventId)
  )
  if (!Number.isFinite(arrival)) return null
  return gracePeriodEndsMs(arrival)
}

async function processExpiredDispute(
  booking: FirestoreBooking,
  now: number,
  source: AutomationLogEntry["source"],
  result: AutomationSweepResult
): Promise<void> {
  const dispute = booking.dispute
  if (!dispute || dispute.status !== "under_review") return
  if (dispute.vendorResponse && dispute.vendorResponse.trim()) return
  if (dispute.resolution || dispute.resolvedAt) return

  const deadline = disputeDeadline(dispute)
  if (now < deadline) return

  result.scannedDisputes += 1

  const refund = await attemptDepositRefund(
    booking,
    "dispute_auto_resolve_family",
    source,
    result.logIds
  )
  if (refund.attempted) result.refundsAttempted += 1
  if (refund.succeeded) result.refundsSucceeded += 1

  const nowMs = Date.now()
  const paymentUpdate: FirestoreBookingPayment | undefined = booking.payment
    ? {
        ...booking.payment,
        ...(refund.succeeded
          ? {
              depositStatus: "refunded" as const,
              refundAmount: refund.amount ?? booking.payment.depositAmount,
              refundConfirmedAt: nowMs,
            }
          : {}),
        updatedAt: nowMs,
      }
    : undefined

  await getAdminDb()
    .collection("bookings")
    .doc(booking.id)
    .update({
      status: "completed",
      dispute: {
        ...dispute,
        status: "resolved",
        resolution: "family",
        resolvedAt: nowMs,
        autoResolved: true,
        autoResolvedReason: "vendor_response_deadline_passed",
      },
      ...(paymentUpdate ? { payment: paymentUpdate } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })

  result.resolvedDisputes += 1

  const familyUid = await resolveWeddingOwnerUid(booking.weddingId)
  const vendorOwnerUid = await resolveVendorOwnerUid(booking.vendorId)
  const weddingLabel = booking.weddingName || "the wedding"
  const eventLabel = booking.eventId

  const created = await notifyParties({
    weddingId: booking.weddingId,
    bookingId: booking.id,
    familyUid,
    vendorOwnerUid,
    type: "dispute_auto_resolved",
    priority: "urgent",
    familyMessage: `Your dispute on ${weddingLabel} (${eventLabel}) was auto-resolved in your favour — the vendor did not respond within 48 hours.`,
    vendorMessage: `Dispute on ${weddingLabel} (${eventLabel}) was auto-resolved for the family because no vendor response arrived within 48 hours.`,
  })
  result.notificationsCreated += created

  const logId = await writeAutomationLog({
    action: "dispute_auto_resolved",
    bookingId: booking.id,
    weddingId: booking.weddingId,
    vendorId: booking.vendorId,
    source,
    message: "Dispute auto-resolved for family after vendor response deadline",
    details: {
      deadline,
      refundSucceeded: refund.succeeded,
      disputedAmount: dispute.disputedAmount ?? null,
    },
  })
  result.logIds.push(logId)

  if (created > 0) {
    const nLog = await writeAutomationLog({
      action: "notification_sent",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: `Sent ${created} dispute_auto_resolved notification(s)`,
      details: { count: created },
    })
    result.logIds.push(nLog)
  }
}

async function processNoShow(
  booking: FirestoreBooking,
  now: number,
  source: AutomationLogEntry["source"],
  result: AutomationSweepResult
): Promise<void> {
  if (booking.status !== "confirmed") return
  if (booking.payment?.checkInAt) return
  if (booking.payment?.depositStatus === "refunded") return

  const graceEnd = resolveGraceEndMs(booking)
  if (graceEnd == null || now < graceEnd) return

  result.scannedNoShows += 1

  const refund = await attemptDepositRefund(booking, "no_show", source, result.logIds)
  if (refund.attempted) result.refundsAttempted += 1
  if (refund.succeeded) result.refundsSucceeded += 1

  const nowMs = Date.now()
  const paymentUpdate: FirestoreBookingPayment | undefined = booking.payment
    ? {
        ...booking.payment,
        depositStatus: refund.succeeded ? "refunded" : booking.payment.depositStatus,
        ...(refund.succeeded
          ? {
              refundAmount: refund.amount ?? booking.payment.depositAmount,
              refundConfirmedAt: nowMs,
            }
          : {}),
        ...(graceEnd ? { gracePeriodEndsAt: graceEnd } : {}),
        updatedAt: nowMs,
        noShowDeclaredAt: nowMs,
        noShowAutoDeclared: true,
      }
    : undefined

  // Increment vendor no-show count for reliability tracking
  // Firestore requires all transaction reads before any writes.
  const vendorRef = getAdminDb().collection("vendors").doc(booking.vendorId)
  const bookingRef = getAdminDb().collection("bookings").doc(booking.id)
  await getAdminDb().runTransaction(async (tx) => {
    const vendorSnap = await tx.get(vendorRef)
    tx.update(bookingRef, {
      status: "no_show",
      ...(paymentUpdate ? { payment: paymentUpdate } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })
    if (vendorSnap.exists) {
      const count = Number(vendorSnap.data()?.noShowCount ?? 0)
      tx.update(vendorRef, {
        noShowCount: count + 1,
        updatedAt: Date.now(),
      })
    }
  })

  result.declaredNoShows += 1

  const familyUid = await resolveWeddingOwnerUid(booking.weddingId)
  const vendorOwnerUid = await resolveVendorOwnerUid(booking.vendorId)
  const weddingLabel = booking.weddingName || "the wedding"

  const created = await notifyParties({
    weddingId: booking.weddingId,
    bookingId: booking.id,
    familyUid,
    vendorOwnerUid,
    type: "no_show_declared",
    priority: "urgent",
    familyMessage: `No-show declared for ${booking.vendorName} on ${weddingLabel}. Your deposit refund is being processed and emergency backup vendors are available in the app.`,
    vendorMessage: `Your booking for ${weddingLabel} was marked No-Show — check-in was not confirmed before the grace period ended.`,
  })
  result.notificationsCreated += created

  const logId = await writeAutomationLog({
    action: "no_show_declared",
    bookingId: booking.id,
    weddingId: booking.weddingId,
    vendorId: booking.vendorId,
    source,
    message: "Booking auto-flipped to no_show after grace period without check-in",
    details: {
      graceEnd,
      refundSucceeded: refund.succeeded,
      emergencyBackupSurfaced: true,
    },
  })
  result.logIds.push(logId)

  if (created > 0) {
    const nLog = await writeAutomationLog({
      action: "notification_sent",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: `Sent ${created} no_show_declared notification(s)`,
      details: { count: created },
    })
    result.logIds.push(nLog)
  }
}

/**
 * Scan open disputes past vendor-response deadline and confirmed bookings past
 * no-show grace. Safe to re-run (skips already resolved / already no-show).
 */
export async function runBookingAutomationSweep(options?: {
  now?: number
  source?: AutomationLogEntry["source"]
}): Promise<AutomationSweepResult> {
  const now = options?.now ?? Date.now()
  const source = options?.source ?? "scheduler"
  const result: AutomationSweepResult = {
    scannedDisputes: 0,
    resolvedDisputes: 0,
    scannedNoShows: 0,
    declaredNoShows: 0,
    refundsAttempted: 0,
    refundsSucceeded: 0,
    notificationsCreated: 0,
    logIds: [],
    errors: [],
  }

  const db = getAdminDb()

  // Disputes under review (status field on booking + dispute.status)
  const disputedSnap = await db.collection("bookings").where("status", "==", "disputed").get()
  for (const docSnap of disputedSnap.docs) {
    const booking = { id: docSnap.id, ...docSnap.data() } as FirestoreBooking
    try {
      await processExpiredDispute(booking, now, source, result)
    } catch (err) {
      result.errors.push(
        `dispute:${booking.id}:${err instanceof Error ? err.message : "unknown"}`
      )
    }
  }

  const confirmedSnap = await db.collection("bookings").where("status", "==", "confirmed").get()
  for (const docSnap of confirmedSnap.docs) {
    const booking = { id: docSnap.id, ...docSnap.data() } as FirestoreBooking
    try {
      await processNoShow(booking, now, source, result)
    } catch (err) {
      result.errors.push(
        `noshow:${booking.id}:${err instanceof Error ? err.message : "unknown"}`
      )
    }
  }

  return result
}

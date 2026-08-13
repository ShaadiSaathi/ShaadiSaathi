/**
 * Firebase Cloud Functions — scheduled booking automation + due-soon reminders.
 * Deploy to STAGING only until explicitly approved for production:
 *   npx firebase-tools deploy --only functions --project shaadisaathistaging
 */

import { initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore"
import { logger } from "firebase-functions"
import { onRequest } from "firebase-functions/v2/https"
import { onSchedule } from "firebase-functions/v2/scheduler"
import Stripe from "stripe"

initializeApp()

const db = getFirestore()

const DISPUTE_VENDOR_RESPONSE_HOURS = 48
const NO_SHOW_GRACE_PERIOD_HOURS = 2

const DEFAULT_EVENT_TIMES: Record<string, string> = {
  mehndi: "18:00",
  baraat: "11:00",
  walima: "19:30",
}

function disputeVendorResponseDeadlineAt(submittedAtMs: number): number {
  return submittedAtMs + DISPUTE_VENDOR_RESPONSE_HOURS * 60 * 60 * 1000
}

function scheduledArrivalMs(eventDate: string, time24h: string): number {
  const [y, m, d] = eventDate.split("-").map(Number)
  const [hh, mm] = time24h.split(":").map(Number)
  if (!y || !m || !d || hh == null || mm == null) return NaN
  return Date.UTC(y, m - 1, d, hh - 5, mm, 0, 0)
}

function gracePeriodEndsMs(arrivalMs: number): number {
  return arrivalMs + NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000
}

function defaultArrivalTimeForEvent(eventId: string): string {
  return DEFAULT_EVENT_TIMES[eventId] ?? "12:00"
}

async function userEmail(uid: string | null): Promise<string | null> {
  if (!uid) return null
  const snap = await db.collection("users").doc(uid).get()
  const email = snap.data()?.email
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null
}

/** Fail-soft Resend send from Cloud Functions (no SDK — keeps functions lean). */
async function sendResendEmail(to: string | null, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key || !to) return
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Shaadi Saathi <onboarding@resend.dev>"
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    })
    if (!res.ok) {
      logger.warn("Resend send failed", { status: res.status, body: await res.text() })
    }
  } catch (err) {
    logger.warn("Resend send error", err)
  }
}

async function emailDisputeOutcomeCf(input: {
  weddingId: string
  vendorId: string
  bookingId: string
  weddingName: string
  eventLabel: string
}) {
  const wedding = (await db.collection("weddings").doc(input.weddingId).get()).data()
  const vendor = (await db.collection("vendors").doc(input.vendorId).get()).data()
  const familyEmail = await userEmail(
    typeof wedding?.ownerId === "string" ? wedding.ownerId : null
  )
  const vendorEmail =
    (await userEmail(typeof vendor?.ownerUid === "string" ? vendor.ownerUid : null)) ||
    (typeof vendor?.email === "string" ? vendor.email.trim() : null)

  const subject = "Shaadi Saathi — dispute resolved in favour of the family"
  await sendResendEmail(
    familyEmail,
    subject,
    [
      "A dispute was auto-resolved because the vendor response window ended.",
      "",
      "Outcome: in favour of the family",
      `Wedding: ${input.weddingName}`,
      `Event: ${input.eventLabel}`,
      `Booking ID: ${input.bookingId}`,
    ].join("\n")
  )
  await sendResendEmail(
    vendorEmail,
    subject,
    [
      "A dispute was auto-resolved because the vendor response window ended.",
      "",
      "Outcome: in favour of the family",
      `Wedding: ${input.weddingName}`,
      `Event: ${input.eventLabel}`,
      `Booking ID: ${input.bookingId}`,
    ].join("\n")
  )
}

/** Inclusive window: due today through the next 2 calendar days (≈24–48h). */
function dueSoonDateStrings(now = new Date()): string[] {
  const dates: string[] = []
  for (let i = 0; i <= 2; i++) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function formatTaskDueSoonMessage(title: string, dueDate: string): string {
  const taskTitle = title.trim() || "a task"
  return `Reminder: '${taskTitle}' is due soon (${dueDate})`
}

type TaskRow = {
  id: string
  weddingId?: string
  title?: string
  assigneeUid?: string
  dueDate?: string
  status?: string
}

type BookingRow = {
  id: string
  weddingId: string
  vendorId: string
  eventId: string
  eventDate?: string
  status: string
  price?: number
  familyName?: string
  weddingName?: string
  vendorName?: string
  payment?: {
    depositAmount?: number
    depositStatus?: string
    checkInAt?: number
    scheduledArrivalAt?: number
    gracePeriodEndsAt?: number
    stripeDepositPaymentIntentId?: string
    [key: string]: unknown
  }
  dispute?: {
    status?: string
    submittedAt?: number
    vendorResponseDeadlineAt?: number
    vendorResponse?: string
    resolution?: string
    resolvedAt?: number
    disputedAmount?: number
    description?: string
    [key: string]: unknown
  }
}

type AutomationAction =
  | "dispute_auto_resolved"
  | "no_show_declared"
  | "refund_attempted"
  | "refund_skipped"
  | "notification_sent"

async function writeLog(input: {
  action: AutomationAction
  bookingId: string
  weddingId?: string
  vendorId?: string
  message: string
  details?: Record<string, string | number | boolean | null>
  source: "scheduler" | "manual_trigger"
}): Promise<string> {
  const ref = db.collection("automation_logs").doc()
  await ref.set({
    id: ref.id,
    ...input,
    createdAt: Date.now(),
  })
  return ref.id
}

async function createInboxNotification(input: {
  recipientUid: string
  weddingId: string
  type: string
  message: string
  bookingId: string
  href: string
  priority?: string
}): Promise<string | null> {
  if (!input.recipientUid || !input.weddingId || !input.message) return null
  const ref = db.collection("notifications").doc()
  await ref.set({
    id: ref.id,
    recipientUid: input.recipientUid,
    weddingId: input.weddingId,
    type: input.type,
    message: input.message.slice(0, 500),
    bookingId: input.bookingId,
    href: input.href,
    read: false,
    createdAt: Date.now(),
    actorName: "Shaadi Saathi",
    ...(input.priority ? { priority: input.priority } : {}),
  })
  return ref.id
}

async function weddingOwnerUid(weddingId: string): Promise<string | null> {
  const snap = await db.collection("weddings").doc(weddingId).get()
  const ownerId = snap.data()?.ownerId
  return typeof ownerId === "string" && ownerId ? ownerId : null
}

async function vendorOwnerUid(vendorId: string): Promise<string | null> {
  const snap = await db.collection("vendors").doc(vendorId).get()
  const ownerUid = snap.data()?.ownerUid
  return typeof ownerUid === "string" && ownerUid ? ownerUid : null
}

function fromStripeAmountUnits(amount: number, currency: string): number {
  const zeroDecimal = new Set(["pkr", "jpy", "krw"])
  if (zeroDecimal.has(currency.toLowerCase())) return amount
  return Math.round(amount / 100)
}

async function tryRefundDeposit(
  booking: BookingRow,
  reason: string,
  source: "scheduler" | "manual_trigger"
): Promise<{ attempted: boolean; succeeded: boolean; amount?: number }> {
  const pi = booking.payment?.stripeDepositPaymentIntentId
  if (!pi || typeof pi !== "string") {
    await writeLog({
      action: "refund_skipped",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: "No Stripe deposit PaymentIntent — status updated without refund",
      details: { reason },
    })
    return { attempted: false, succeeded: false }
  }
  if (booking.payment?.depositStatus === "refunded") {
    return { attempted: false, succeeded: false }
  }

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret || !secret.startsWith("sk_")) {
    await writeLog({
      action: "refund_skipped",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: "STRIPE_SECRET_KEY missing/invalid on function — refund skipped",
      details: { reason },
    })
    return { attempted: true, succeeded: false }
  }

  try {
    const stripe = new Stripe(secret)
    const existing = await stripe.paymentIntents.retrieve(pi)
    let amountRefunded = 0
    let refundId = existing.id
    let status: string = existing.status

    if (existing.status === "requires_capture") {
      const canceled = await stripe.paymentIntents.cancel(pi, {
        cancellation_reason: "requested_by_customer",
      })
      amountRefunded = fromStripeAmountUnits(canceled.amount, canceled.currency)
      refundId = canceled.id
      status = canceled.status
    } else if (existing.status === "succeeded") {
      const refund = await stripe.refunds.create(
        {
          payment_intent: pi,
          reason: "requested_by_customer",
          metadata: { bookingId: booking.id, reason },
        },
        { idempotencyKey: `refund_deposit_${booking.id}` }
      )
      amountRefunded = fromStripeAmountUnits(refund.amount, existing.currency)
      refundId = refund.id
      status = refund.status ?? "pending"
    } else {
      throw new Error(`Cannot refund PaymentIntent in status "${existing.status}"`)
    }

    await writeLog({
      action: "refund_attempted",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: `Deposit refund succeeded (${amountRefunded} PKR)`,
      details: { reason, refundId, amountRefundedPkr: amountRefunded, status },
    })
    return { attempted: true, succeeded: true, amount: amountRefunded }
  } catch (err) {
    await writeLog({
      action: "refund_skipped",
      bookingId: booking.id,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      source,
      message: `Deposit refund failed: ${err instanceof Error ? err.message : "unknown"}`,
      details: { reason },
    })
    return { attempted: true, succeeded: false }
  }
}

function resolveGraceEnd(booking: BookingRow): number | null {
  const g = booking.payment?.gracePeriodEndsAt
  if (typeof g === "number") return g
  const a = booking.payment?.scheduledArrivalAt
  if (typeof a === "number") return gracePeriodEndsMs(a)
  if (!booking.eventDate) return null
  const arrival = scheduledArrivalMs(
    booking.eventDate,
    defaultArrivalTimeForEvent(booking.eventId)
  )
  if (!Number.isFinite(arrival)) return null
  return gracePeriodEndsMs(arrival)
}

export async function runDueSoonReminders(): Promise<{
  scanned: number
  created: number
  skippedDuplicate: number
  skippedNoAssignee: number
}> {
  const dueDates = dueSoonDateStrings()
  let scanned = 0
  let created = 0
  let skippedDuplicate = 0
  let skippedNoAssignee = 0

  for (const dueDate of dueDates) {
    const snap = await db.collection("tasks").where("dueDate", "==", dueDate).get()
    for (const docSnap of snap.docs) {
      scanned += 1
      const task = { id: docSnap.id, ...docSnap.data() } as TaskRow
      if (task.status === "done") continue
      if (!task.assigneeUid || !task.weddingId) {
        skippedNoAssignee += 1
        continue
      }

      const existing = await db
        .collection("notifications")
        .where("taskId", "==", task.id)
        .where("recipientUid", "==", task.assigneeUid)
        .where("type", "==", "task_due_soon")
        .limit(1)
        .get()

      if (!existing.empty) {
        skippedDuplicate += 1
        continue
      }

      const ref = db.collection("notifications").doc()
      await ref.set({
        id: ref.id,
        recipientUid: task.assigneeUid,
        weddingId: task.weddingId,
        type: "task_due_soon",
        message: formatTaskDueSoonMessage(task.title ?? "a task", dueDate),
        taskId: task.id,
        href: `/tasks#task-${task.id}`,
        read: false,
        createdAt: Date.now(),
        actorName: "Shaadi Saathi",
      })
      created += 1
    }
  }

  return { scanned, created, skippedDuplicate, skippedNoAssignee }
}

export async function runBookingAutomationSweep(options?: {
  now?: number
  source?: "scheduler" | "manual_trigger"
}): Promise<{
  scannedDisputes: number
  resolvedDisputes: number
  scannedNoShows: number
  declaredNoShows: number
  refundsAttempted: number
  refundsSucceeded: number
  notificationsCreated: number
  errors: string[]
}> {
  const now = options?.now ?? Date.now()
  const source = options?.source ?? "scheduler"
  const result = {
    scannedDisputes: 0,
    resolvedDisputes: 0,
    scannedNoShows: 0,
    declaredNoShows: 0,
    refundsAttempted: 0,
    refundsSucceeded: 0,
    notificationsCreated: 0,
    errors: [] as string[],
  }

  const disputedSnap = await db.collection("bookings").where("status", "==", "disputed").get()
  for (const docSnap of disputedSnap.docs) {
    const booking = { id: docSnap.id, ...docSnap.data() } as BookingRow
    try {
      const dispute = booking.dispute
      if (!dispute || dispute.status !== "under_review") continue
      if (dispute.vendorResponse && String(dispute.vendorResponse).trim()) continue
      if (dispute.resolution || dispute.resolvedAt) continue
      const deadline =
        typeof dispute.vendorResponseDeadlineAt === "number"
          ? dispute.vendorResponseDeadlineAt
          : disputeVendorResponseDeadlineAt(Number(dispute.submittedAt ?? 0))
      if (!deadline || now < deadline) continue

      result.scannedDisputes += 1
      const refund = await tryRefundDeposit(booking, "dispute_auto_resolve_family", source)
      if (refund.attempted) result.refundsAttempted += 1
      if (refund.succeeded) result.refundsSucceeded += 1

      const nowMs = Date.now()
      const paymentUpdate = booking.payment
        ? {
            ...booking.payment,
            ...(refund.succeeded
              ? {
                  depositStatus: "refunded",
                  refundAmount: refund.amount ?? booking.payment.depositAmount ?? 0,
                  refundConfirmedAt: nowMs,
                }
              : {}),
            updatedAt: nowMs,
          }
        : undefined

      await db
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

      const familyUid = await weddingOwnerUid(booking.weddingId)
      const vendorUid = await vendorOwnerUid(booking.vendorId)
      const weddingLabel = booking.weddingName || "the wedding"
      const eventLabel = booking.eventId
      let created = 0
      if (familyUid) {
        const id = await createInboxNotification({
          recipientUid: familyUid,
          weddingId: booking.weddingId,
          type: "dispute_auto_resolved",
          message: `Your dispute on ${weddingLabel} (${eventLabel}) was auto-resolved in your favour — the vendor did not respond within 48 hours.`,
          bookingId: booking.id,
          href: `/vendors/bookings#booking-${booking.id}`,
          priority: "urgent",
        })
        if (id) created += 1
      }
      if (vendorUid) {
        const id = await createInboxNotification({
          recipientUid: vendorUid,
          weddingId: booking.weddingId,
          type: "dispute_auto_resolved",
          message: `Dispute on ${weddingLabel} (${eventLabel}) was auto-resolved for the family because no vendor response arrived within 48 hours.`,
          bookingId: booking.id,
          href: `/vendor/jobs/${booking.id}`,
          priority: "urgent",
        })
        if (id) created += 1
      }
      result.notificationsCreated += created

      await writeLog({
        action: "dispute_auto_resolved",
        bookingId: booking.id,
        weddingId: booking.weddingId,
        vendorId: booking.vendorId,
        source,
        message: "Dispute auto-resolved for family after vendor response deadline",
        details: { deadline, refundSucceeded: refund.succeeded },
      })

      // Optional Resend emails (skip if RESEND_API_KEY unset or user has no email)
      await emailDisputeOutcomeCf({
        weddingId: booking.weddingId,
        vendorId: booking.vendorId,
        bookingId: booking.id,
        weddingName: weddingLabel,
        eventLabel: String(eventLabel),
      })
    } catch (err) {
      result.errors.push(
        `dispute:${booking.id}:${err instanceof Error ? err.message : "unknown"}`
      )
    }
  }

  const confirmedSnap = await db.collection("bookings").where("status", "==", "confirmed").get()
  for (const docSnap of confirmedSnap.docs) {
    const booking = { id: docSnap.id, ...docSnap.data() } as BookingRow
    try {
      if (booking.payment?.checkInAt) continue
      if (booking.payment?.depositStatus === "refunded") continue
      const graceEnd = resolveGraceEnd(booking)
      if (graceEnd == null || now < graceEnd) continue

      result.scannedNoShows += 1
      const refund = await tryRefundDeposit(booking, "no_show", source)
      if (refund.attempted) result.refundsAttempted += 1
      if (refund.succeeded) result.refundsSucceeded += 1

      const nowMs = Date.now()
      const paymentUpdate = booking.payment
        ? {
            ...booking.payment,
            ...(refund.succeeded
              ? {
                  depositStatus: "refunded",
                  refundAmount: refund.amount ?? booking.payment.depositAmount ?? 0,
                  refundConfirmedAt: nowMs,
                }
              : {}),
            gracePeriodEndsAt: graceEnd,
            noShowDeclaredAt: nowMs,
            noShowAutoDeclared: true,
            updatedAt: nowMs,
          }
        : undefined

      await db.runTransaction(async (tx) => {
        const bookingRef = db.collection("bookings").doc(booking.id)
        const vendorRef = db.collection("vendors").doc(booking.vendorId)
        const vendorSnap = await tx.get(vendorRef)
        tx.update(bookingRef, {
          status: "no_show",
          ...(paymentUpdate ? { payment: paymentUpdate } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        })
        if (vendorSnap.exists) {
          const count = Number(vendorSnap.data()?.noShowCount ?? 0)
          tx.update(vendorRef, { noShowCount: count + 1, updatedAt: Date.now() })
        }
      })

      result.declaredNoShows += 1

      const familyUid = await weddingOwnerUid(booking.weddingId)
      const vendorUid = await vendorOwnerUid(booking.vendorId)
      const weddingLabel = booking.weddingName || "the wedding"
      let created = 0
      if (familyUid) {
        const id = await createInboxNotification({
          recipientUid: familyUid,
          weddingId: booking.weddingId,
          type: "no_show_declared",
          message: `No-show declared for ${booking.vendorName || "your vendor"} on ${weddingLabel}. Your deposit refund is being processed and emergency backup vendors are available in the app.`,
          bookingId: booking.id,
          href: `/vendors/bookings#booking-${booking.id}`,
          priority: "urgent",
        })
        if (id) created += 1
      }
      if (vendorUid) {
        const id = await createInboxNotification({
          recipientUid: vendorUid,
          weddingId: booking.weddingId,
          type: "no_show_declared",
          message: `Your booking for ${weddingLabel} was marked No-Show — check-in was not confirmed before the grace period ended.`,
          bookingId: booking.id,
          href: `/vendor/jobs/${booking.id}`,
          priority: "urgent",
        })
        if (id) created += 1
      }
      result.notificationsCreated += created

      await writeLog({
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
    } catch (err) {
      result.errors.push(
        `noshow:${booking.id}:${err instanceof Error ? err.message : "unknown"}`
      )
    }
  }

  return result
}

/** Every 15 minutes — dispute deadlines + no-show grace. */
export const runBookingAutomations = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Asia/Karachi",
    region: "us-central1",
  },
  async () => {
    const result = await runBookingAutomationSweep({ source: "scheduler" })
    logger.info("Booking automation sweep finished", result)
  }
)

/** Daily due-soon reminders — Asia/Karachi morning. */
export const createDueSoonReminders = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Karachi",
    region: "us-central1",
  },
  async () => {
    const result = await runDueSoonReminders()
    logger.info("Due-soon reminders finished", result)
  }
)

/** Manual staging trigger for booking automations. */
export const triggerBookingAutomations = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  async (req, res) => {
    const secret =
      process.env.AUTOMATION_TRIGGER_SECRET || process.env.REMINDER_TRIGGER_SECRET
    if (!secret || req.get("x-automation-secret") !== secret) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    try {
      const result = await runBookingAutomationSweep({ source: "manual_trigger" })
      res.status(200).json({ ok: true, ...result, at: Timestamp.now().toMillis() })
    } catch (err) {
      logger.error("Manual booking automation trigger failed", err)
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to run automation",
      })
    }
  }
)

/** Manual staging trigger for due-soon reminders. */
export const triggerDueSoonReminders = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  async (req, res) => {
    const secret = process.env.REMINDER_TRIGGER_SECRET
    if (!secret || req.get("x-reminder-secret") !== secret) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    try {
      const result = await runDueSoonReminders()
      res.status(200).json({ ok: true, ...result, at: Timestamp.now().toMillis() })
    } catch (err) {
      logger.error("Manual due-soon trigger failed", err)
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to run reminders",
      })
    }
  }
)

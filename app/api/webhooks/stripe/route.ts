/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Stripe webhook — updates Firestore booking payment fields from real events.
 * Configure the endpoint in Stripe Dashboard (test mode) pointing at staging:
 *   https://<staging-host>/api/webhooks/stripe
 * Required events: payment_intent.amount_capturable_updated,
 * payment_intent.succeeded, payment_intent.payment_failed,
 * payment_intent.canceled, charge.refunded
 */

import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { constructStripeWebhookEvent } from "@/lib/payments/stripe"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin not configured" }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ message: "Missing stripe-signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = constructStripeWebhookEvent(rawBody, signature)
  } catch (error) {
    console.error("[webhooks/stripe] signature verification failed", error)
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated":
      case "payment_intent.succeeded":
      case "payment_intent.canceled":
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent
        await applyPaymentIntentEvent(intent, event.type)
        break
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id
        if (piId) {
          await markDepositRefunded(piId)
        }
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[webhooks/stripe] handler error", error)
    return NextResponse.json({ message: "Webhook handler failed" }, { status: 500 })
  }
}

async function findBookingByPaymentIntent(
  paymentIntentId: string,
  bookingIdFromMeta?: string
) {
  const db = getAdminDb()
  if (bookingIdFromMeta) {
    const snap = await db.collection("bookings").doc(bookingIdFromMeta).get()
    if (snap.exists) return snap
  }

  const byDeposit = await db
    .collection("bookings")
    .where("payment.stripeDepositPaymentIntentId", "==", paymentIntentId)
    .limit(1)
    .get()
  if (!byDeposit.empty) return byDeposit.docs[0]!

  const byBalance = await db
    .collection("bookings")
    .where("payment.stripeBalancePaymentIntentId", "==", paymentIntentId)
    .limit(1)
    .get()
  if (!byBalance.empty) return byBalance.docs[0]!

  return null
}

async function applyPaymentIntentEvent(
  intent: Stripe.PaymentIntent,
  eventType: string
) {
  const bookingId = intent.metadata?.bookingId
  const kind = intent.metadata?.kind as "deposit" | "balance" | undefined
  const snap = await findBookingByPaymentIntent(intent.id, bookingId)
  if (!snap) {
    console.warn("[webhooks/stripe] no booking for PaymentIntent", intent.id)
    return
  }

  const data = snap.data() as { payment?: FirestoreBookingPayment; status?: string }
  const payment = data.payment
  if (!payment) return

  const now = Date.now()
  const next: FirestoreBookingPayment = { ...payment, updatedAt: now }

  if (kind === "deposit" || payment.stripeDepositPaymentIntentId === intent.id) {
    if (
      eventType === "payment_intent.succeeded" ||
      eventType === "payment_intent.amount_capturable_updated"
    ) {
      // Funds collected (or authorized on legacy manual-capture PIs).
      // UI "Held" = platform escrow until vendor check-in marks Released.
      // Do NOT map succeeded → released here — that is check-in only.
      next.depositStatus = "held"
      next.depositPaidAt = next.depositPaidAt ?? now
      next.stripeDepositPaymentIntentId = intent.id
      await snap.ref.update({
        payment: next,
        status: data.status === "requested" ? "confirmed" : data.status,
        updatedAt: now,
      })
      return
    }
    if (eventType === "payment_intent.canceled") {
      next.depositStatus = "refunded"
      next.refundAmount = payment.depositAmount
      next.refundConfirmedAt = now
      await snap.ref.update({ payment: next, status: "no_show", updatedAt: now })
      return
    }
  }

  if (kind === "balance" || payment.stripeBalancePaymentIntentId === intent.id) {
    if (eventType === "payment_intent.succeeded") {
      next.balanceStatus = "charged_pending_release"
      next.balanceChargedAt = now
      next.stripeBalancePaymentIntentId = intent.id
      await snap.ref.update({ payment: next, updatedAt: now })
    }
  }
}

async function markDepositRefunded(paymentIntentId: string) {
  const snap = await findBookingByPaymentIntent(paymentIntentId)
  if (!snap) return
  const data = snap.data() as { payment?: FirestoreBookingPayment }
  if (!data.payment) return
  const now = Date.now()
  await snap.ref.update({
    payment: {
      ...data.payment,
      depositStatus: "refunded",
      refundAmount: data.payment.depositAmount,
      refundConfirmedAt: now,
      updatedAt: now,
    },
    updatedAt: now,
  })
}

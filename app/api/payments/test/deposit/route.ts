/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPORARY STRIPE TEST HARNESS — DO NOT SHIP AS A PRODUCT FEATURE
 * ═══════════════════════════════════════════════════════════════════════════
 * Unauthenticated endpoint that creates a deposit PaymentIntent via the same
 * collectDeposit() used by the real booking flow. No Firestore writes, no
 * sign-in. Still refuses production Firebase / live keys / Vercel production.
 * Delete this route once staging E2E booking payments are verified.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import {
  collectDeposit,
  getFirebaseProjectId,
  getPaymentsAvailability,
  isFirebaseProductionProject,
  isVercelProduction,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  PRODUCTION_FIREBASE_PROJECT_ID,
  requireStripeConfigured,
} from "@/lib/payments"

export const runtime = "nodejs"

const TEST_BOOKING_ID = "test-booking-stripe-harness"
const TEST_WEDDING_ID = "test-wedding-stripe-harness"
const TEST_VENDOR_ID = "test-vendor-stripe-harness"

/** PKR amounts below this often fail Stripe's FX minimum (~30 pence). */
const MIN_AMOUNT_PKR = 5000

function assertTestHarnessAllowed(): void {
  if (isVercelProduction()) {
    throw new PaymentsSafetyError(
      "Stripe test harness is blocked on Vercel production."
    )
  }
  if (isFirebaseProductionProject()) {
    throw new PaymentsSafetyError(
      `Stripe test harness is blocked while Firebase project is ${PRODUCTION_FIREBASE_PROJECT_ID}. Switch to shaadisaathistaging.`
    )
  }
  // Double-check credentials (also enforces test keys + env allowlist)
  requireStripeConfigured()
}

export async function GET() {
  try {
    assertTestHarnessAllowed()
    const availability = getPaymentsAvailability()
    return NextResponse.json({
      ok: availability.canCollect,
      harness: "stripe-deposit-test",
      temporary: true,
      firebaseProjectId: getFirebaseProjectId() ?? null,
      currency: availability.currency,
      minAmountPkr: MIN_AMOUNT_PKR,
      testBookingId: TEST_BOOKING_ID,
      message: availability.canCollect
        ? null
        : availability.message ?? PAYMENTS_UNAVAILABLE_MESSAGE,
      publishableKey: availability.publishableKey,
    })
  } catch (error) {
    if (
      error instanceof PaymentsNotConfiguredError ||
      error instanceof PaymentsSafetyError
    ) {
      return NextResponse.json(
        {
          ok: false,
          harness: "stripe-deposit-test",
          temporary: true,
          firebaseProjectId: getFirebaseProjectId() ?? null,
          message: error.message,
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { ok: false, message: PAYMENTS_UNAVAILABLE_MESSAGE },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  try {
    assertTestHarnessAllowed()
    const { publishableKey } = requireStripeConfigured()

    const body = (await request.json().catch(() => ({}))) as {
      amountPkr?: number
    }
    const amountPkr = Math.round(Number(body.amountPkr))
    if (!Number.isFinite(amountPkr) || amountPkr < MIN_AMOUNT_PKR) {
      return NextResponse.json(
        {
          message: `Enter an amount of at least Rs. ${MIN_AMOUNT_PKR.toLocaleString("en-PK")} (Stripe FX minimum for PKR).`,
        },
        { status: 400 }
      )
    }

    // Unique booking id per attempt so Stripe idempotency keys don't collide
    const bookingId = `${TEST_BOOKING_ID}-${Date.now()}`

    const intent = await collectDeposit({
      bookingId,
      weddingId: TEST_WEDDING_ID,
      vendorId: TEST_VENDOR_ID,
      amountPkr,
      paymentPath: "online",
      description: `TEMPORARY harness deposit — ${bookingId}`,
    })

    return NextResponse.json({
      temporary: true,
      bookingId,
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      publishableKey,
      currency: intent.currency,
      amountPkr: intent.amountPkr,
      stripeStatus: intent.status,
      /** Maps to our UI deposit vocabulary after successful confirm */
      depositStatusIfSucceeded: "held",
    })
  } catch (error) {
    if (
      error instanceof PaymentsNotConfiguredError ||
      error instanceof PaymentsSafetyError
    ) {
      return NextResponse.json(
        { message: error.message || PAYMENTS_UNAVAILABLE_MESSAGE },
        { status: 503 }
      )
    }
    console.error("[payments/test/deposit]", error)
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not start test deposit",
      },
      { status: 500 }
    )
  }
}

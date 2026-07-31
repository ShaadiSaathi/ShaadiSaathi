/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import {
  collectBalance,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  requireStripeConfigured,
} from "@/lib/payments"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingPaymentOwner,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const user = await verifyPaymentUser(request)
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const { publishableKey } = requireStripeConfigured()
    const body = (await request.json()) as { bookingId?: string }
    const bookingId = body.bookingId?.trim()
    if (!bookingId) {
      return NextResponse.json({ message: "Missing bookingId" }, { status: 400 })
    }

    const bookingRef = getAdminDb().collection("bookings").doc(bookingId)
    const snap = await bookingRef.get()
    if (!snap.exists) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    const booking = snap.data() as {
      weddingId?: string
      vendorId?: string
      vendorName?: string
      createdByUid?: string
      payment?: FirestoreBookingPayment
      price?: number
    }

    if (!booking.weddingId) {
      return NextResponse.json({ message: "Booking is missing wedding" }, { status: 400 })
    }
    await assertWeddingPaymentOwner(booking.weddingId, user.uid)

    const payment = booking.payment
    if (!payment || payment.paymentPath !== "online") {
      return NextResponse.json(
        { message: "This booking is not on the online balance path" },
        { status: 400 }
      )
    }
    if (payment.balanceStatus !== "pending_online") {
      return NextResponse.json(
        { message: `Balance is not due (status: ${payment.balanceStatus})` },
        { status: 400 }
      )
    }
    if (!booking.weddingId || !booking.vendorId) {
      return NextResponse.json({ message: "Booking is missing wedding or vendor" }, { status: 400 })
    }

    const intent = await collectBalance({
      bookingId,
      weddingId: booking.weddingId,
      vendorId: booking.vendorId,
      amountPkr: payment.balanceAmount,
      description: `Balance — ${booking.vendorName ?? "vendor"}`,
    })

    await bookingRef.update({
      "payment.stripeBalancePaymentIntentId": intent.paymentIntentId,
      "payment.updatedAt": Date.now(),
    })

    return NextResponse.json({
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      publishableKey,
      currency: intent.currency,
      amountPkr: intent.amountPkr,
    })
  } catch (error) {
    if (error instanceof PaymentAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    if (
      error instanceof PaymentsNotConfiguredError ||
      error instanceof PaymentsSafetyError
    ) {
      return NextResponse.json(
        { message: error.message || PAYMENTS_UNAVAILABLE_MESSAGE },
        { status: 503 }
      )
    }
    console.error("[payments/balance/create]", error)
    return NextResponse.json(
      { message: "Could not start balance payment" },
      { status: 500 }
    )
  }
}

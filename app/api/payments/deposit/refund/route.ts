/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Cancel uncaptured deposit / refund captured deposit (no-show path).
 */

import { NextResponse } from "next/server"
import {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  refundDeposit,
} from "@/lib/payments"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingOwnerOrVendorOwner,
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

    const body = (await request.json()) as { bookingId?: string; reason?: string }
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
      payment?: FirestoreBookingPayment
    }
    if (!booking.weddingId) {
      return NextResponse.json({ message: "Booking is missing wedding" }, { status: 400 })
    }
    await assertWeddingOwnerOrVendorOwner(booking.weddingId, booking.vendorId, user.uid)

    const paymentIntentId = booking.payment?.stripeDepositPaymentIntentId
    if (!paymentIntentId) {
      return NextResponse.json(
        { message: "No Stripe deposit on this booking to refund" },
        { status: 400 }
      )
    }

    const result = await refundDeposit({
      paymentIntentId,
      bookingId,
      reason: body.reason ?? "no_show",
    })

    const now = Date.now()
    await bookingRef.update({
      status: "no_show",
      payment: {
        ...(booking.payment as FirestoreBookingPayment),
        depositStatus: "refunded",
        refundAmount: result.amountRefundedPkr,
        refundConfirmedAt: now,
        updatedAt: now,
      },
      updatedAt: now,
    })

    return NextResponse.json({ ok: true, ...result })
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
    console.error("[payments/deposit/refund]", error)
    return NextResponse.json({ message: "Could not refund deposit" }, { status: 500 })
  }
}

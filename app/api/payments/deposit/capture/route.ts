/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Marks deposit as Released after vendor check-in.
 * Deposit funds are already collected (automatic capture); this updates
 * platform escrow accounting. Legacy manual-capture PIs are captured here.
 */

import { NextResponse } from "next/server"
import {
  captureHeldDeposit,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
} from "@/lib/payments"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingOwnerOrVendorOwner,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { assertVendorVerifiedForPayments } from "@/lib/server/vendor-verification"
import { attemptVendorPayoutForBooking } from "@/lib/server/vendor-payout"

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
      payment?: FirestoreBookingPayment
    }
    if (!booking.weddingId) {
      return NextResponse.json({ message: "Booking is missing wedding" }, { status: 400 })
    }
    await assertWeddingOwnerOrVendorOwner(booking.weddingId, booking.vendorId, user.uid)

    if (!booking.vendorId) {
      return NextResponse.json({ message: "Booking is missing vendor" }, { status: 400 })
    }
    await assertVendorVerifiedForPayments(booking.vendorId)

    const paymentIntentId = booking.payment?.stripeDepositPaymentIntentId
    if (!paymentIntentId) {
      return NextResponse.json(
        {
          message:
            "This booking has no Stripe deposit to capture. Payments may not have been configured when it was created.",
        },
        { status: 400 }
      )
    }

    const result = await captureHeldDeposit({ paymentIntentId, bookingId })
    const now = Date.now()
    const payment: FirestoreBookingPayment = {
      ...(booking.payment as FirestoreBookingPayment),
      depositStatus: "released",
      checkInAt: booking.payment?.checkInAt ?? now,
      updatedAt: now,
    }

    if (payment.paymentPath === "online" && payment.balanceStatus === "pending_online") {
      payment.balanceStatus = "charged_pending_release"
      payment.balanceChargedAt = now
    }

    // After release, attempt real Safepay payout (sandbox unless signed off).
    // Missing credentials / IBAN / KYC write a clear payout state — never silent.
    const payout = await attemptVendorPayoutForBooking({
      bookingId,
      vendorId: booking.vendorId,
      payment,
    })

    await bookingRef.update({ payment: payout.payment, updatedAt: Date.now() })

    return NextResponse.json({
      ok: true,
      status: result.status,
      amountCapturedPkr: result.amountCapturedPkr,
      payout: {
        attempted: payout.attempted,
        status: payout.payment.safepayPayoutStatus ?? null,
        error: payout.payment.safepayPayoutError ?? null,
        message: payout.message,
      },
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
    console.error("[payments/deposit/capture]", error)
    return NextResponse.json({ message: "Could not capture deposit" }, { status: 500 })
  }
}

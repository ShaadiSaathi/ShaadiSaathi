/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Safepay Raastwire payout to the vendor's stored Pakistani IBAN (sandbox by
 * default). IBAN is never accepted from the client — only from
 * vendor_payout_accounts.
 *
 * Without SAFEPAY_* env vars this returns 503 with a friendly message and
 * still records safepayPayoutError on the booking when release already ran.
 */

import { NextResponse } from "next/server"
import {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
} from "@/lib/payments"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingPaymentOwner,
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
      return NextResponse.json({ message: "bookingId is required" }, { status: 400 })
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
    await assertWeddingPaymentOwner(booking.weddingId, user.uid)

    if (!booking.vendorId) {
      return NextResponse.json({ message: "Booking is missing vendor" }, { status: 400 })
    }
    // Hard gate — unverified vendors cannot receive payouts
    await assertVendorVerifiedForPayments(booking.vendorId)

    const payment = booking.payment
    if (!payment) {
      return NextResponse.json({ message: "Booking has no payment record" }, { status: 400 })
    }

    const releasable =
      payment.depositStatus === "released" ||
      payment.balanceStatus === "charged_pending_release" ||
      payment.balanceStatus === "released_online" ||
      payment.balanceStatus === "paid_in_person"

    if (!releasable) {
      return NextResponse.json(
        {
          message:
            "Funds are not ready to release. Capture the deposit / complete the job first.",
        },
        { status: 400 }
      )
    }

    const result = await attemptVendorPayoutForBooking({
      bookingId,
      vendorId: booking.vendorId,
      payment,
    })

    const now = Date.now()
    await bookingRef.update({
      payment: result.payment,
      status: "completed",
      updatedAt: now,
    })

    const payoutStatus = result.payment.safepayPayoutStatus
    const unavailable =
      !result.attempted &&
      Boolean(result.payment.safepayPayoutError?.includes("not yet available"))

    if (unavailable) {
      return NextResponse.json(
        {
          ok: false,
          payoutUnavailable: true,
          message:
            result.message ??
            "Payouts not yet available. Safepay credentials have not been configured.",
          payment: {
            safepayPayoutStatus: result.payment.safepayPayoutStatus ?? null,
            safepayPayoutError: result.payment.safepayPayoutError ?? null,
          },
        },
        { status: 503 }
      )
    }

    if (payoutStatus === "P_FAILED" || payoutStatus === "P_REJECTED") {
      return NextResponse.json(
        {
          ok: false,
          message: result.message ?? "Payout failed",
          status: payoutStatus,
          payment: {
            safepayPayoutStatus: payoutStatus,
            safepayPayoutError: result.payment.safepayPayoutError ?? null,
          },
        },
        { status: 502 }
      )
    }

    if (!result.attempted && result.message) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
          payment: {
            safepayPayoutStatus: result.payment.safepayPayoutStatus ?? null,
            safepayPayoutError: result.payment.safepayPayoutError ?? null,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      token: result.payment.safepayPayoutToken,
      status: result.payment.safepayPayoutStatus,
      message: result.message,
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
    console.error("[payments/payout]", error)
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not pay out to vendor",
      },
      { status: 500 }
    )
  }
}

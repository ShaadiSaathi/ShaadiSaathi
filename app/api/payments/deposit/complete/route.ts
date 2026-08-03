/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Confirms a deposit PaymentIntent succeeded (funds collected into platform
 * escrow) and promotes the booking to confirmed with depositStatus "held".
 */

import { NextResponse } from "next/server"
import {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
} from "@/lib/payments"
import { retrievePaymentIntent } from "@/lib/payments/stripe"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingPaymentOwner,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import {
  VendorAvailabilityError,
  claimVendorDateLockInTransaction,
  resolveEventDateForWedding,
} from "@/lib/server/vendor-availability"
import type { EventId } from "@/lib/mockData"

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

    const body = (await request.json()) as {
      bookingId?: string
      paymentIntentId?: string
    }
    const bookingId = body.bookingId?.trim()
    const paymentIntentId = body.paymentIntentId?.trim()
    if (!bookingId || !paymentIntentId) {
      return NextResponse.json({ message: "Missing booking or payment id" }, { status: 400 })
    }

    const bookingRef = getAdminDb().collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    const booking = bookingSnap.data() as {
      createdByUid?: string
      weddingId?: string
      vendorId?: string
      eventId?: EventId
      eventDate?: string
      payment?: FirestoreBookingPayment
    }

    if (!booking.weddingId) {
      return NextResponse.json({ message: "Booking is missing wedding" }, { status: 400 })
    }
    if (!booking.vendorId || !booking.eventId) {
      return NextResponse.json({ message: "Booking is missing vendor or event" }, { status: 400 })
    }
    await assertWeddingPaymentOwner(booking.weddingId, user.uid)

    const intent = await retrievePaymentIntent(paymentIntentId)
    if (intent.metadata?.bookingId && intent.metadata.bookingId !== bookingId) {
      return NextResponse.json({ message: "Payment does not match booking" }, { status: 400 })
    }

    const authorized =
      intent.status === "succeeded" || intent.status === "requires_capture"
    if (!authorized) {
      return NextResponse.json(
        {
          message: `Deposit payment is not complete (status: ${intent.status}). Use a Stripe test card (e.g. 4242…).`,
        },
        { status: 400 }
      )
    }

    const weddingSnap = await getAdminDb().collection("weddings").doc(booking.weddingId).get()
    if (!weddingSnap.exists) {
      return NextResponse.json({ message: "Wedding not found" }, { status: 404 })
    }
    const wedding = weddingSnap.data()!
    const eventDate =
      booking.eventDate ??
      resolveEventDateForWedding(
        {
          eventOverrides: wedding.eventOverrides,
          firstEventDate: wedding.firstEventDate,
        },
        booking.eventId
      )

    const now = Date.now()
    const prev = booking.payment
    const {
      defaultArrivalTimeForEvent,
      gracePeriodEndsMs,
      scheduledArrivalMs,
    } = await import("@/lib/automation/constants")
    const arrivalMs = scheduledArrivalMs(
      eventDate,
      defaultArrivalTimeForEvent(booking.eventId)
    )
    const payment: FirestoreBookingPayment = {
      ...(prev as FirestoreBookingPayment),
      depositStatus: "held",
      depositPaidAt: now,
      stripeDepositPaymentIntentId: paymentIntentId,
      ...(Number.isFinite(arrivalMs)
        ? {
            scheduledArrivalAt: arrivalMs,
            gracePeriodEndsAt: gracePeriodEndsMs(arrivalMs),
          }
        : {}),
      updatedAt: now,
    }

    await getAdminDb().runTransaction(async (tx) => {
      await claimVendorDateLockInTransaction(tx, {
        vendorId: booking.vendorId!,
        eventDate,
        weddingId: booking.weddingId!,
        bookingId,
      })
      tx.update(bookingRef, {
        status: "confirmed",
        eventDate,
        payment,
        updatedAt: now,
      })
    })

    // Payment receipt email only — never fail the payment confirmation
    try {
      const { getWeddingOwnerEmail, sendPaymentReceiptEmail } = await import(
        "@/lib/email"
      )
      const family = await getWeddingOwnerEmail(booking.weddingId)
      const weddingName =
        typeof wedding.name === "string" ? wedding.name : undefined
      const bookingDoc = bookingSnap.data() as {
        vendorName?: string
        weddingName?: string
        eventId?: string
      }
      await sendPaymentReceiptEmail({
        to: family.email,
        kind: "deposit",
        amountPkr: payment.depositAmount,
        bookingId,
        weddingName: bookingDoc.weddingName ?? weddingName,
        vendorName: bookingDoc.vendorName,
        eventLabel: booking.eventId,
      })
    } catch (emailErr) {
      console.error("[payments/deposit/complete] email skipped:", emailErr)
      try {
        const Sentry = await import("@sentry/nextjs")
        Sentry.captureException(emailErr, {
          tags: { component: "email", trigger: "deposit-complete" },
        })
      } catch {
        // Sentry unavailable — console already logged
      }
    }

    return NextResponse.json({ ok: true, status: intent.status })
  } catch (error) {
    if (error instanceof PaymentAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    if (error instanceof VendorAvailabilityError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status }
      )
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
    console.error("[payments/deposit/complete]", error)
    return NextResponse.json(
      { message: "Could not confirm deposit payment" },
      { status: 500 }
    )
  }
}

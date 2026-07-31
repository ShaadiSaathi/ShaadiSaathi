/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Creates a Stripe PaymentIntent (manual capture) for the booking deposit.
 * Persists a draft booking in Firestore as "requested" until the client
 * completes payment and calls /deposit/complete.
 */

import { NextResponse } from "next/server"
import {
  collectDeposit,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  requireStripeConfigured,
} from "@/lib/payments"
import { buildHeldDepositPayment } from "@/lib/payments/booking-payment"
import { calculateDepositSplit, type InPersonMethod, type PaymentPath } from "@/lib/mockPayments"
import type { EventId } from "@/lib/mockData"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingPaymentOwner,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import {
  VendorAvailabilityError,
  assertVendorDateOpen,
  resolveEventDateForWedding,
} from "@/lib/server/vendor-availability"

export const runtime = "nodejs"

type Body = {
  bookingId?: string
  weddingId?: string
  vendorId?: string
  amountPkr?: number
  totalPrice?: number
  paymentPath?: PaymentPath
  inPersonMethod?: InPersonMethod
  packageName?: string
  guestCount?: number
  note?: string
  eventId?: EventId
  familyName?: string
  weddingName?: string
  vendorName?: string
}

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
    const body = (await request.json()) as Body

    const bookingId = body.bookingId?.trim()
    const weddingId = body.weddingId?.trim()
    const vendorId = body.vendorId?.trim()
    const paymentPath = body.paymentPath
    const eventId = body.eventId
    const totalPrice = body.totalPrice
    const amountPkr = body.amountPkr

    if (
      !bookingId ||
      !weddingId ||
      !vendorId ||
      !paymentPath ||
      !eventId ||
      typeof totalPrice !== "number" ||
      typeof amountPkr !== "number"
    ) {
      return NextResponse.json({ message: "Missing booking payment fields" }, { status: 400 })
    }

    await assertWeddingPaymentOwner(weddingId, user.uid)

    const weddingSnap = await getAdminDb().collection("weddings").doc(weddingId).get()
    if (!weddingSnap.exists) {
      return NextResponse.json({ message: "Wedding not found" }, { status: 404 })
    }
    const wedding = weddingSnap.data()!
    const eventDate = resolveEventDateForWedding(
      {
        eventOverrides: wedding.eventOverrides,
        firstEventDate: wedding.firstEventDate,
      },
      eventId
    )
    await assertVendorDateOpen({
      vendorId,
      eventDate,
      weddingId,
      excludeBookingId: bookingId,
    })

    const split = calculateDepositSplit(totalPrice)
    if (Math.abs(split.depositAmount - amountPkr) > 1) {
      return NextResponse.json(
        { message: "Deposit amount does not match expected split" },
        { status: 400 }
      )
    }

    const intent = await collectDeposit({
      bookingId,
      weddingId,
      vendorId,
      amountPkr: split.depositAmount,
      paymentPath,
      inPersonMethod: body.inPersonMethod,
      customerEmail: user.email,
      description: `Deposit — ${body.vendorName ?? "vendor"} / ${body.weddingName ?? "wedding"}`,
    })

    // Draft booking until PaymentIntent is authorized
    const payment = buildHeldDepositPayment({
      totalPrice,
      paymentPath,
      inPersonMethod: body.inPersonMethod,
      stripeDepositPaymentIntentId: intent.paymentIntentId,
    })
    // Not yet paid — mark deposit as held only after complete; store draft fields
    const draftPayment = {
      ...payment,
      depositPaidAt: undefined as number | undefined,
      // Keep depositStatus held once authorized; until then track via booking status
    }

    await getAdminDb()
      .collection("bookings")
      .doc(bookingId)
      .set(
        {
          id: bookingId,
          weddingId,
          vendorId,
          eventId,
          eventDate,
          status: "requested",
          price: totalPrice,
          paymentPath,
          familyName: body.familyName ?? "",
          weddingName: body.weddingName ?? "",
          vendorName: body.vendorName ?? "Vendor",
          ...(body.packageName ? { packageName: body.packageName } : {}),
          ...(body.guestCount != null ? { guestCount: body.guestCount } : {}),
          ...(body.note ? { note: body.note } : {}),
          payment: draftPayment,
          createdByUid: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      )

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
    console.error("[payments/deposit/create]", error)
    return NextResponse.json(
      { message: "Could not start deposit payment" },
      { status: 500 }
    )
  }
}

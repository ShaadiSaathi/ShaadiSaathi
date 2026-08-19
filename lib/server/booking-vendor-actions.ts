/**
 * Vendor day-of actions on bookings — check-in and mark complete.
 * Payment fields must be updated via Admin SDK (Firestore rules block client payment writes).
 */

import { FieldValue } from "firebase-admin/firestore"
import {
  captureHeldDeposit,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
} from "@/lib/payments"
import type { FirestoreBookingPayment } from "@/lib/payments/types"
import type { FirestoreBooking } from "@/lib/firebase/types"
import { getAdminDb } from "@/lib/server/firebase-admin"
import {
  PaymentAuthError,
  assertWeddingOwnerOrVendorOwner,
} from "@/lib/server/payment-auth"
import { assertVendorVerifiedForPayments } from "@/lib/server/vendor-verification"
import { attemptVendorPayoutForBooking } from "@/lib/server/vendor-payout"
import { paymentFromFirestore } from "@/lib/payments/booking-payment"

export type CheckInPhotoInput = {
  name: string
  uploadedAt: number
}

export async function applyVendorCheckIn(input: {
  bookingId: string
  uid: string
  checkInPhoto: CheckInPhotoInput
}): Promise<{ alreadyCheckedIn: boolean; checkInAt: number }> {
  const db = getAdminDb()
  const bookingRef = db.collection("bookings").doc(input.bookingId)
  const snap = await bookingRef.get()
  if (!snap.exists) {
    throw new PaymentAuthError(404, "Booking not found")
  }

  const booking = { id: snap.id, ...snap.data() } as FirestoreBooking
  if (!booking.weddingId) {
    throw new PaymentAuthError(400, "Booking is missing wedding")
  }
  await assertWeddingOwnerOrVendorOwner(booking.weddingId, booking.vendorId, input.uid)

  const existingCheckIn = booking.payment?.checkInAt
  if (typeof existingCheckIn === "number" && Number.isFinite(existingCheckIn)) {
    return { alreadyCheckedIn: true, checkInAt: existingCheckIn }
  }

  if (booking.status !== "confirmed" && booking.status !== "disputed") {
    throw new PaymentAuthError(
      409,
      `Cannot check in for a booking with status “${booking.status}”.`
    )
  }

  const now = Date.now()
  const basePayment =
    paymentFromFirestore(booking.payment, booking.price, booking.paymentPath) ??
    paymentFromFirestore(undefined, booking.price, booking.paymentPath)!
  let payment: FirestoreBookingPayment = {
    ...basePayment,
    checkInAt: now,
    checkInStatus: "confirmed",
    checkInPhoto: {
      name: input.checkInPhoto.name.trim() || "check-in-photo",
      uploadedAt: input.checkInPhoto.uploadedAt,
    },
    depositStatus:
      booking.payment?.depositStatus === "refunded"
        ? "refunded"
        : "released",
    updatedAt: now,
  }

  if (payment.paymentPath === "online" && payment.balanceStatus === "pending_online") {
    payment.balanceStatus = "charged_pending_release"
    payment.balanceChargedAt = now
  }

  const paymentIntentId = booking.payment?.stripeDepositPaymentIntentId
  if (paymentIntentId && booking.vendorId) {
    try {
      await assertVendorVerifiedForPayments(booking.vendorId)
      await captureHeldDeposit({
        paymentIntentId,
        bookingId: input.bookingId,
      })
      const payout = await attemptVendorPayoutForBooking({
        bookingId: input.bookingId,
        vendorId: booking.vendorId,
        payment,
      })
      payment = payout.payment
    } catch (err) {
      if (
        err instanceof PaymentsNotConfiguredError ||
        err instanceof PaymentsSafetyError
      ) {
        // Record check-in even when Stripe/Safepay is unavailable on this environment.
        console.warn("[booking-vendor-actions/check-in] payments skipped:", err.message)
      } else {
        throw err
      }
    }
  }

  await bookingRef.update({ payment, updatedAt: now })
  return { alreadyCheckedIn: false, checkInAt: now }
}

export async function applyVendorComplete(input: {
  bookingId: string
  uid: string
}): Promise<{ alreadyCompleted: boolean }> {
  const db = getAdminDb()
  const bookingRef = db.collection("bookings").doc(input.bookingId)
  const snap = await bookingRef.get()
  if (!snap.exists) {
    throw new PaymentAuthError(404, "Booking not found")
  }

  const booking = { id: snap.id, ...snap.data() } as FirestoreBooking
  if (!booking.vendorId) {
    throw new PaymentAuthError(400, "Booking is missing vendor")
  }

  const vendorSnap = await db.collection("vendors").doc(booking.vendorId).get()
  const vendorOwnerUid =
    typeof vendorSnap.data()?.ownerUid === "string"
      ? (vendorSnap.data()!.ownerUid as string)
      : ""
  if (vendorOwnerUid !== input.uid) {
    throw new PaymentAuthError(403, "Only the vendor can mark this job completed.")
  }

  if (booking.status === "completed") {
    return { alreadyCompleted: true }
  }

  if (booking.status !== "confirmed") {
    throw new PaymentAuthError(
      409,
      `Cannot complete a booking with status “${booking.status}”.`
    )
  }

  const eventDate = booking.eventDate?.trim() ?? ""
  const today = new Date().toISOString().slice(0, 10)
  const hasCheckIn = typeof booking.payment?.checkInAt === "number"
  if (!hasCheckIn && eventDate && eventDate > today) {
    throw new PaymentAuthError(
      409,
      "Check in on the event day or wait until after the event to mark completed."
    )
  }

  const now = Date.now()
  const paymentPath = booking.payment?.paymentPath ?? booking.paymentPath
  const basePayment =
    paymentFromFirestore(booking.payment, booking.price, paymentPath) ??
    paymentFromFirestore(undefined, booking.price, paymentPath)!
  const payment: FirestoreBookingPayment = {
    ...basePayment,
    balanceStatus:
      paymentPath === "in_person" ? "paid_in_person" : "released_online",
    balanceMarkedPaidAt: now,
    updatedAt: now,
  }

  const vendorRef = db.collection("vendors").doc(booking.vendorId)

  await db.runTransaction(async (tx) => {
    tx.update(bookingRef, {
      status: "completed",
      payment,
      updatedAt: now,
    })
    tx.update(vendorRef, {
      completedJobsCount: FieldValue.increment(1),
      updatedAt: now,
    })
  })

  return { alreadyCompleted: false }
}

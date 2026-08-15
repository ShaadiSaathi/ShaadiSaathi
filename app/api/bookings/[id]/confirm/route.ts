/**
 * Confirm a booking request and claim the vendor date lock atomically.
 * Used when a vendor accepts a request or a family accepts a counter-offer.
 * Clients cannot transition bookings to "confirmed" via Firestore rules alone.
 */

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import type { FirestoreBooking } from "@/lib/firebase/types"
import {
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  VendorAvailabilityError,
  claimVendorDateLockInTransaction,
  resolveEventDateForWedding,
} from "@/lib/server/vendor-availability"

export const runtime = "nodejs"

type Body = {
  /** When accepting a vendor counter-offer, apply the offered price. */
  price?: number
  packageName?: string
  clearCounterOffer?: boolean
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Booking service is not configured on this server." },
      { status: 503 }
    )
  }

  let uid: string
  try {
    ;({ uid } = await verifyPaymentUser(request))
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: bookingId } = await context.params
  if (!bookingId?.trim()) {
    return NextResponse.json({ error: "Missing booking id." }, { status: 400 })
  }

  let body: Body = {}
  try {
    const raw = await request.json().catch(() => ({}))
    if (typeof raw === "object" && raw !== null) body = raw as Body
  } catch {
    body = {}
  }

  const db = getAdminDb()
  const bookingRef = db.collection("bookings").doc(bookingId)
  const bookingSnap = await bookingRef.get()
  if (!bookingSnap.exists) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 })
  }

  const booking = bookingSnap.data() as FirestoreBooking
  if (!booking.vendorId || !booking.weddingId || !booking.eventId) {
    return NextResponse.json(
      { error: "Booking is missing vendor, wedding, or event." },
      { status: 400 }
    )
  }

  const vendorSnap = await db.collection("vendors").doc(booking.vendorId).get()
  const vendorOwnerUid =
    typeof vendorSnap.data()?.ownerUid === "string"
      ? (vendorSnap.data()!.ownerUid as string)
      : ""
  const weddingSnap = await db.collection("weddings").doc(booking.weddingId).get()
  if (!weddingSnap.exists) {
    return NextResponse.json({ error: "Wedding not found." }, { status: 404 })
  }
  const wedding = weddingSnap.data()!
  const weddingOwnerId =
    typeof wedding.ownerId === "string" ? wedding.ownerId : ""

  const isVendor = vendorOwnerUid === uid
  const isWeddingOwner = weddingOwnerId === uid
  if (!isVendor && !isWeddingOwner) {
    return NextResponse.json(
      { error: "Only the vendor or wedding owner can confirm this booking." },
      { status: 403 }
    )
  }

  if (booking.status === "confirmed") {
    return NextResponse.json({
      ok: true,
      bookingId,
      eventDate: booking.eventDate,
      status: "confirmed" as const,
      alreadyConfirmed: true,
    })
  }

  if (booking.status !== "requested") {
    return NextResponse.json(
      {
        error: `Cannot confirm a booking with status “${booking.status}”.`,
      },
      { status: 409 }
    )
  }

  let eventDate = booking.eventDate?.trim() || ""
  if (!eventDate) {
    try {
      eventDate = resolveEventDateForWedding(
        {
          eventOverrides: wedding.eventOverrides,
          firstEventDate: wedding.firstEventDate,
        },
        booking.eventId
      )
    } catch (err) {
      if (err instanceof VendorAvailabilityError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.status }
        )
      }
      throw err
    }
  }

  const now = Date.now()
  const updates: Record<string, unknown> = {
    status: "confirmed",
    eventDate,
    updatedAt: now,
  }
  if (typeof body.price === "number" && Number.isFinite(body.price) && body.price > 0) {
    updates.price = body.price
  }
  if (typeof body.packageName === "string" && body.packageName.trim()) {
    updates.packageName = body.packageName.trim()
  }
  if (body.clearCounterOffer) {
    updates.counterOffer = FieldValue.delete()
  }

  try {
    await db.runTransaction(async (tx) => {
      await claimVendorDateLockInTransaction(tx, {
        vendorId: booking.vendorId,
        eventDate,
        weddingId: booking.weddingId,
        bookingId,
      })
      tx.update(bookingRef, updates)
    })
  } catch (err) {
    if (err instanceof VendorAvailabilityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      )
    }
    console.error("[api/bookings/confirm]", err)
    return NextResponse.json(
      { error: "Could not confirm booking. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    bookingId,
    eventDate,
    status: "confirmed" as const,
  })
}

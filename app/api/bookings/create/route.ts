import { NextResponse } from "next/server"
import type { EventId } from "@/lib/mockData"
import type { InPersonMethod, PaymentPath } from "@/lib/mockPayments"
import type { BookingStatus } from "@/lib/mockVendors"
import type { FirestoreBooking } from "@/lib/firebase/types"
import {
  PaymentAuthError,
  assertWeddingPaymentOwner,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  VendorAvailabilityError,
  assertVendorDateOpen,
  claimVendorDateLockInTransaction,
  resolveEventDateForWedding,
} from "@/lib/server/vendor-availability"
import { createNotificationAdmin } from "@/lib/server/notifications"

export const runtime = "nodejs"

const EVENT_IDS = new Set<EventId>(["mehndi", "baraat", "walima"])
const PAYMENT_PATHS = new Set<PaymentPath>(["in_person", "online"])

interface CreateBookingBody {
  bookingId?: string
  weddingId?: string
  vendorId?: string
  eventId?: EventId
  price?: number
  packageName?: string
  guestCount?: number
  note?: string
  paymentPath?: PaymentPath
  inPersonMethod?: InPersonMethod
  familyName?: string
  weddingName?: string
  vendorName?: string
  status?: BookingStatus
}

function parseBody(raw: unknown): CreateBookingBody {
  if (typeof raw !== "object" || raw === null) return {}
  return raw as CreateBookingBody
}

export async function POST(request: Request) {
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

  let body: CreateBookingBody
  try {
    body = parseBody(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const weddingId = body.weddingId?.trim() ?? ""
  const vendorId = body.vendorId?.trim() ?? ""
  const eventId = body.eventId
  const paymentPath = body.paymentPath
  const price = body.price
  const bookingId =
    body.bookingId?.trim() ||
    `booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (
    !weddingId ||
    !vendorId ||
    !eventId ||
    !EVENT_IDS.has(eventId) ||
    !paymentPath ||
    !PAYMENT_PATHS.has(paymentPath) ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid booking fields." },
      { status: 400 }
    )
  }

  try {
    await assertWeddingPaymentOwner(weddingId, uid)
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  const db = getAdminDb()
  const weddingSnap = await db.collection("weddings").doc(weddingId).get()
  if (!weddingSnap.exists) {
    return NextResponse.json({ error: "Wedding not found." }, { status: 404 })
  }

  const wedding = weddingSnap.data()!
  let eventDate: string
  try {
    eventDate = resolveEventDateForWedding(
      {
        eventOverrides: wedding.eventOverrides,
        firstEventDate: wedding.firstEventDate,
      },
      eventId
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

  const status: BookingStatus =
    body.status === "requested" ? "requested" : "confirmed"

  const booking: FirestoreBooking = {
    id: bookingId,
    weddingId,
    vendorId,
    eventId,
    eventDate,
    status,
    price,
    paymentPath,
    familyName: body.familyName?.trim() || wedding.organiserName || "",
    weddingName: body.weddingName?.trim() || wedding.name || "",
    vendorName: body.vendorName?.trim() || "Vendor",
    createdAt: Date.now(),
    createdByUid: uid,
    ...(body.packageName ? { packageName: body.packageName } : {}),
    ...(body.guestCount != null ? { guestCount: body.guestCount } : {}),
    ...(body.note ? { note: body.note } : {}),
  }

  try {
    // Reject create when the date is already confirmed (lock or legacy booking).
    // Confirmed creates also re-check inside the transaction via claim.
    await assertVendorDateOpen({ vendorId, eventDate, weddingId })

    await db.runTransaction(async (tx) => {
      // Only confirmed bookings claim the calendar lock.
      if (status === "confirmed") {
        await claimVendorDateLockInTransaction(tx, {
          vendorId,
          eventDate,
          weddingId,
          bookingId,
        })
      } else {
        // Re-check lock inside the transaction so a concurrent confirm cannot race.
        const lockRef = db
          .collection("vendor_date_locks")
          .doc(`${vendorId}_${eventDate}`)
        const lockSnap = await tx.get(lockRef)
        if (lockSnap.exists) {
          const lock = lockSnap.data() as { weddingId: string }
          if (lock.weddingId !== weddingId) {
            const pretty = new Date(`${eventDate}T12:00:00`).toLocaleDateString(
              "en-US",
              { day: "numeric", month: "short" }
            )
            throw new VendorAvailabilityError(
              409,
              "DATE_CONFLICT",
              `This vendor is already booked on ${pretty}. Please choose a different date.`
            )
          }
        }
      }

      const bookingRef = db.collection("bookings").doc(bookingId)
      const existing = await tx.get(bookingRef)
      if (existing.exists) {
        throw new VendorAvailabilityError(
          409,
          "DATE_CONFLICT",
          "A booking with this id already exists."
        )
      }
      tx.set(bookingRef, booking)
    })
  } catch (err) {
    if (err instanceof VendorAvailabilityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      )
    }
    console.error("booking create failed", err)
    return NextResponse.json(
      { error: "Could not create booking. Please try again." },
      { status: 500 }
    )
  }

  // In-app notification for the vendor (foundation for future FCM push).
  try {
    const vendorSnap = await db.collection("vendors").doc(vendorId).get()
    const ownerUid =
      typeof vendorSnap.data()?.ownerUid === "string"
        ? (vendorSnap.data()!.ownerUid as string)
        : ""
    if (ownerUid && ownerUid !== uid) {
      const eventLabel =
        eventId === "mehndi" ? "Mehndi" : eventId === "baraat" ? "Baraat" : "Walima"
      const family = booking.familyName || "A family"
      const wedding = booking.weddingName || "their wedding"
      await createNotificationAdmin({
        recipientUid: ownerUid,
        weddingId,
        type: "booking_request",
        message: `${family} sent a booking request for ${eventLabel} (${wedding})`,
        bookingId,
        href: status === "requested" ? "/vendor/requests" : `/vendor/jobs/${bookingId}`,
        actorUid: uid,
        actorName: family,
      })
    }
  } catch (notifyErr) {
    console.error("booking notification failed", notifyErr)
  }

  return NextResponse.json({
    ok: true,
    bookingId,
    eventDate,
    status,
  })
}

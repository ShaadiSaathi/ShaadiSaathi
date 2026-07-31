/**
 * Server-side vendor date conflict checks + lock claims (Admin SDK).
 *
 * Confirmed bookings hard-block a vendor+date via `vendor_date_locks`.
 * Pending/requested bookings do not claim a lock and do not block.
 */

import type { Transaction } from "firebase-admin/firestore"
import type { EventId } from "@/lib/mockData"
import { resolveWeddingEvent } from "@/lib/events/rsvp-lock"
import type { BookingStatus } from "@/lib/mockVendors"
import {
  BLOCKING_BOOKING_STATUSES,
  isValidEventDate,
  vendorDateLockId,
} from "@/lib/firebase/vendor-availability"
import type { FirestoreWedding } from "@/lib/firebase/types"
import { getAdminDb } from "@/lib/server/firebase-admin"

export class VendorAvailabilityError extends Error {
  readonly status: number
  readonly code: "DATE_CONFLICT" | "INVALID_DATE" | "WEDDING_NOT_FOUND"

  constructor(
    status: number,
    code: VendorAvailabilityError["code"],
    message: string
  ) {
    super(message)
    this.name = "VendorAvailabilityError"
    this.status = status
    this.code = code
  }
}

function conflictMessage(eventDate: string, ownWedding: boolean): string {
  const pretty = new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  })
  return ownWedding
    ? `This vendor is already booked for your wedding on ${pretty}.`
    : `This vendor is already booked on ${pretty}. Please choose a different date.`
}

export function resolveEventDateForWedding(
  wedding: Pick<FirestoreWedding, "eventOverrides" | "firstEventDate">,
  eventId: EventId
): string {
  const resolved = resolveWeddingEvent(eventId, wedding.eventOverrides ?? null)
  const date = resolved?.date?.trim() || wedding.firstEventDate?.trim() || ""
  if (!isValidEventDate(date)) {
    throw new VendorAvailabilityError(
      400,
      "INVALID_DATE",
      "This wedding event does not have a valid date yet. Set the event date before booking."
    )
  }
  return date
}

/**
 * Throws DATE_CONFLICT when another wedding (or another booking on this wedding)
 * already holds a confirmed lock / blocking booking for vendor+date.
 */
export async function assertVendorDateOpen(options: {
  vendorId: string
  eventDate: string
  weddingId: string
  excludeBookingId?: string
}): Promise<void> {
  const db = getAdminDb()
  const lockRef = db
    .collection("vendor_date_locks")
    .doc(vendorDateLockId(options.vendorId, options.eventDate))
  const lockSnap = await lockRef.get()

  if (lockSnap.exists) {
    const lock = lockSnap.data() as { weddingId: string; bookingId: string }
    if (
      options.excludeBookingId &&
      lock.bookingId === options.excludeBookingId
    ) {
      return
    }
    throw new VendorAvailabilityError(
      409,
      "DATE_CONFLICT",
      conflictMessage(options.eventDate, lock.weddingId === options.weddingId)
    )
  }

  // Legacy bookings written before locks existed
  const snap = await db
    .collection("bookings")
    .where("vendorId", "==", options.vendorId)
    .where("eventDate", "==", options.eventDate)
    .get()

  for (const doc of snap.docs) {
    const data = doc.data() as { weddingId: string; status: BookingStatus }
    if (!BLOCKING_BOOKING_STATUSES.has(data.status)) continue
    if (options.excludeBookingId && doc.id === options.excludeBookingId) continue
    throw new VendorAvailabilityError(
      409,
      "DATE_CONFLICT",
      conflictMessage(options.eventDate, data.weddingId === options.weddingId)
    )
  }
}

/** Claim (or re-claim same booking) the date lock inside an Admin transaction. */
export async function claimVendorDateLockInTransaction(
  tx: Transaction,
  options: {
    vendorId: string
    eventDate: string
    weddingId: string
    bookingId: string
  }
): Promise<void> {
  const lockRef = getAdminDb()
    .collection("vendor_date_locks")
    .doc(vendorDateLockId(options.vendorId, options.eventDate))
  const lockSnap = await tx.get(lockRef)

  if (lockSnap.exists) {
    const lock = lockSnap.data() as { weddingId: string; bookingId: string }
    if (
      lock.weddingId === options.weddingId &&
      lock.bookingId === options.bookingId
    ) {
      return
    }
    throw new VendorAvailabilityError(
      409,
      "DATE_CONFLICT",
      conflictMessage(options.eventDate, lock.weddingId === options.weddingId)
    )
  }

  tx.set(lockRef, {
    vendorId: options.vendorId,
    eventDate: options.eventDate,
    bookingId: options.bookingId,
    weddingId: options.weddingId,
    status: "confirmed",
    createdAt: Date.now(),
  })
}

/**
 * Platform-wide vendor date availability.
 *
 * Source of truth: confirmed bookings in `bookings`, mirrored by
 * `vendor_date_locks/{vendorId}_{YYYY-MM-DD}` written in the same Admin
 * transaction so UI checks and create enforcement stay in sync.
 *
 * Policy:
 * - Confirmed (and completed/disputed) bookings HARD-BLOCK the date.
 * - Requested/pending bookings from other families do NOT block — soft warn only.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import type { EventId } from "@/lib/mockData"
import type { BookingStatus } from "@/lib/mockVendors"
import { getFirestoreDb } from "./config"

/** Statuses that occupy the vendor's calendar for that date. */
export const BLOCKING_BOOKING_STATUSES: ReadonlySet<BookingStatus> = new Set([
  "confirmed",
  "completed",
  "disputed",
])

export function vendorDateLockId(vendorId: string, eventDate: string): string {
  return `${vendorId}_${eventDate}`
}

export function isValidEventDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export interface VendorDateLock {
  id: string
  vendorId: string
  eventDate: string
  bookingId: string
  weddingId: string
  status: "confirmed"
  createdAt: number
}

export type VendorDateAvailability =
  | { state: "open" }
  | {
      state: "blocked"
      bookingId: string
      weddingId: string
      /** True when the blocking booking belongs to the viewer's wedding */
      isOwnWedding: boolean
    }
  | { state: "pending_elsewhere"; bookingId: string; weddingId: string }

export async function getVendorDateLock(
  vendorId: string,
  eventDate: string
): Promise<VendorDateLock | null> {
  if (!vendorId || !isValidEventDate(eventDate)) return null
  const snap = await getDoc(
    doc(getFirestoreDb(), "vendor_date_locks", vendorDateLockId(vendorId, eventDate))
  )
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as VendorDateLock
}

export async function checkVendorDateAvailability(options: {
  vendorId: string
  eventDate: string
  weddingId?: string | null
}): Promise<VendorDateAvailability> {
  if (!options.vendorId || !isValidEventDate(options.eventDate)) {
    return { state: "open" }
  }

  const lock = await getVendorDateLock(options.vendorId, options.eventDate)
  if (lock) {
    return {
      state: "blocked",
      bookingId: lock.bookingId,
      weddingId: lock.weddingId,
      isOwnWedding: Boolean(
        options.weddingId && lock.weddingId === options.weddingId
      ),
    }
  }

  // Fallback: bookings that predate locks, plus pending soft-warns.
  const snap = await getDocs(
    query(
      collection(getFirestoreDb(), "bookings"),
      where("vendorId", "==", options.vendorId),
      where("eventDate", "==", options.eventDate)
    )
  )

  let pendingElsewhere: { bookingId: string; weddingId: string } | null = null

  for (const bookingDoc of snap.docs) {
    const data = bookingDoc.data() as {
      weddingId?: string
      status?: BookingStatus
    }
    const weddingId = typeof data.weddingId === "string" ? data.weddingId : ""
    const status = data.status

    if (status && BLOCKING_BOOKING_STATUSES.has(status)) {
      return {
        state: "blocked",
        bookingId: bookingDoc.id,
        weddingId,
        isOwnWedding: Boolean(options.weddingId && weddingId === options.weddingId),
      }
    }

    if (
      status === "requested" &&
      weddingId &&
      options.weddingId &&
      weddingId !== options.weddingId &&
      !pendingElsewhere
    ) {
      pendingElsewhere = { bookingId: bookingDoc.id, weddingId }
    } else if (
      status === "requested" &&
      weddingId &&
      !options.weddingId &&
      !pendingElsewhere
    ) {
      pendingElsewhere = { bookingId: bookingDoc.id, weddingId }
    }
  }

  if (pendingElsewhere) {
    return {
      state: "pending_elsewhere",
      bookingId: pendingElsewhere.bookingId,
      weddingId: pendingElsewhere.weddingId,
    }
  }

  return { state: "open" }
}

export function formatUnavailableDateLabel(
  eventName: string,
  eventDate: string
): string {
  const pretty = new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  })
  return `Not available on ${pretty} (${eventName})`
}

export function formatAvailableDateLabel(
  eventName: string,
  eventDate: string
): string {
  const pretty = new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  })
  return `Available for your ${eventName} (${pretty})`
}

/** Soft-warn copy when another family has a pending request (not a hard block). */
export function formatPendingElsewhereLabel(
  eventName: string,
  eventDate: string
): string {
  const pretty = new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  })
  return `Another family has a pending request for ${eventName} on ${pretty} — still bookable until confirmed`
}

export type EventAvailabilityKind =
  | "open"
  | "service_unavailable"
  | "date_blocked"
  | "date_blocked_own"
  | "pending_elsewhere"

export interface ResolvedEventAvailability {
  available: boolean
  kind: EventAvailabilityKind
  eventId: EventId
  eventDate: string
  eventName: string
  label: string
}

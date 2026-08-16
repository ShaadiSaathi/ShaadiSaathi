/**
 * Vendor reviews — one per booking, linked to vendor profile aggregates.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { EventId } from "@/lib/mockData"
import type { BookingStatus } from "@/lib/mockVendors"
import { getFirestoreDb, isFirebaseConfigured } from "./config"
import type { FirestoreBooking, FirestoreVendorReview } from "./types"

export const VENDOR_REVIEW_COMMENT_MAX = 1000
export const VENDOR_REPLY_MAX = 1000

export type BookingReviewEligibility = {
  bookingId: string
  vendorId: string
  weddingId: string
  eventId: EventId
  eventDate?: string
  status: BookingStatus
  familyName: string
  weddingName: string
}

/** True when the service date has passed (local calendar day) or status is completed. */
export function isBookingReviewEligible(input: {
  status: BookingStatus
  eventDate?: string | null
  now?: Date
}): boolean {
  if (input.status === "completed") return true
  if (input.status === "declined" || input.status === "no_show" || input.status === "requested") {
    return false
  }
  // confirmed / disputed — allow only after the event date
  const eventDate = input.eventDate?.trim()
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false
  const now = input.now ?? new Date()
  const today = now.toISOString().slice(0, 10)
  return eventDate < today
}

export function clampReviewRating(rating: unknown): number | null {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null
  const n = Math.round(rating)
  if (n < 1 || n > 5) return null
  return n
}

export function normalizeReviewComment(comment: unknown): string | undefined {
  if (comment == null) return undefined
  if (typeof comment !== "string") return undefined
  const trimmed = comment.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, VENDOR_REVIEW_COMMENT_MAX)
}

export function toVendorReview(
  id: string,
  data: Record<string, unknown>
): FirestoreVendorReview {
  return {
    id,
    bookingId: String(data.bookingId ?? id),
    vendorId: String(data.vendorId ?? ""),
    weddingId: String(data.weddingId ?? ""),
    authorUid: String(data.authorUid ?? ""),
    familyName: String(data.familyName ?? "A family"),
    weddingName:
      typeof data.weddingName === "string" ? data.weddingName : undefined,
    eventId: data.eventId as EventId,
    eventDate: typeof data.eventDate === "string" ? data.eventDate : undefined,
    rating: Number(data.rating) || 0,
    comment: typeof data.comment === "string" ? data.comment : undefined,
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
    vendorReply:
      typeof data.vendorReply === "string" ? data.vendorReply : undefined,
    vendorReplyAt:
      typeof data.vendorReplyAt === "number" ? data.vendorReplyAt : undefined,
    vendorReplyByUid:
      typeof data.vendorReplyByUid === "string"
        ? data.vendorReplyByUid
        : undefined,
  }
}

export async function getVendorReview(
  bookingId: string
): Promise<FirestoreVendorReview | null> {
  if (!isFirebaseConfigured()) return null
  const snap = await getDoc(doc(getFirestoreDb(), "vendor_reviews", bookingId))
  if (!snap.exists()) return null
  return toVendorReview(snap.id, snap.data() as Record<string, unknown>)
}

export function subscribeVendorReviews(
  vendorId: string,
  onData: (reviews: FirestoreVendorReview[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Filter only (no orderBy) so listings work before the composite index is ready.
  // Sort newest-first in memory — review counts per vendor stay small.
  const q = query(
    collection(getFirestoreDb(), "vendor_reviews"),
    where("vendorId", "==", vendorId)
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) =>
        toVendorReview(d.id, d.data() as Record<string, unknown>)
      )
      list.sort((a, b) => b.createdAt - a.createdAt)
      onData(list)
    },
    (err) => onError?.(err)
  )
}

export function bookingToReviewEligibility(
  booking: Pick<
    FirestoreBooking,
    | "id"
    | "vendorId"
    | "weddingId"
    | "eventId"
    | "eventDate"
    | "status"
    | "familyName"
    | "weddingName"
  >
): BookingReviewEligibility {
  return {
    bookingId: booking.id,
    vendorId: booking.vendorId,
    weddingId: booking.weddingId,
    eventId: booking.eventId,
    eventDate: booking.eventDate,
    status: booking.status,
    familyName: booking.familyName,
    weddingName: booking.weddingName,
  }
}

/** Round average to 1 decimal for display / storage. */
export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0
  const sum = ratings.reduce((a, b) => a + b, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

/**
 * Admin-side vendor review writes (used by /api/reviews).
 */

import type { FirestoreBooking, FirestoreVendorReview } from "@/lib/firebase/types"
import {
  clampReviewRating,
  isBookingReviewEligible,
  normalizeReviewComment,
} from "@/lib/firebase/vendor-reviews"
import { getAdminDb } from "@/lib/server/firebase-admin"

export class VendorReviewError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "VendorReviewError"
    this.status = status
  }
}

export async function upsertVendorReviewForMember(input: {
  uid: string
  bookingId: string
  rating: number
  comment?: string
}): Promise<FirestoreVendorReview> {
  const rating = clampReviewRating(input.rating)
  const comment = normalizeReviewComment(input.comment)
  if (!input.bookingId.trim() || rating == null) {
    throw new VendorReviewError(
      400,
      "Choose a booking and a rating from 1 to 5 stars."
    )
  }

  const db = getAdminDb()
  const bookingId = input.bookingId.trim()
  const bookingRef = db.collection("bookings").doc(bookingId)
  const reviewRef = db.collection("vendor_reviews").doc(bookingId)
  const uid = input.uid

  return db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef)
    if (!bookingSnap.exists) {
      throw new VendorReviewError(404, "Booking not found.")
    }
    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as FirestoreBooking

    const weddingRef = db.collection("weddings").doc(booking.weddingId)
    const weddingSnap = await tx.get(weddingRef)
    if (!weddingSnap.exists) {
      throw new VendorReviewError(404, "Wedding not found.")
    }
    const memberUids =
      (weddingSnap.data()?.memberUids as string[] | undefined) ?? []
    if (!memberUids.includes(uid)) {
      throw new VendorReviewError(
        403,
        "Only members of this wedding can leave a review."
      )
    }

    if (
      !isBookingReviewEligible({
        status: booking.status,
        eventDate: booking.eventDate,
      })
    ) {
      throw new VendorReviewError(
        400,
        "You can leave a review after the event date has passed, or once the booking is marked completed."
      )
    }

    const vendorRef = db.collection("vendors").doc(booking.vendorId)
    const vendorSnap = await tx.get(vendorRef)
    if (!vendorSnap.exists) {
      throw new VendorReviewError(404, "Vendor not found.")
    }

    const existingSnap = await tx.get(reviewRef)
    const now = Date.now()
    const weddingData = weddingSnap.data() ?? {}
    const familyName =
      (typeof weddingData.organiserName === "string" &&
        weddingData.organiserName.trim()) ||
      booking.familyName ||
      "A family"
    const weddingName =
      (typeof weddingData.name === "string" && weddingData.name.trim()) ||
      booking.weddingName ||
      undefined

    const prevRating = existingSnap.exists
      ? Number((existingSnap.data() as { rating?: number }).rating) || 0
      : null

    const reviewDoc: FirestoreVendorReview = {
      id: bookingId,
      bookingId,
      vendorId: booking.vendorId,
      weddingId: booking.weddingId,
      authorUid: existingSnap.exists
        ? String(
            (existingSnap.data() as { authorUid?: string }).authorUid ?? uid
          )
        : uid,
      familyName,
      ...(weddingName ? { weddingName } : {}),
      eventId: booking.eventId,
      ...(booking.eventDate ? { eventDate: booking.eventDate } : {}),
      rating,
      createdAt: existingSnap.exists
        ? Number((existingSnap.data() as { createdAt?: number }).createdAt) ||
          now
        : now,
      updatedAt: now,
    }
    if (comment) reviewDoc.comment = comment

    if (existingSnap.exists) {
      const prev = existingSnap.data() as Partial<FirestoreVendorReview>
      if (prev.vendorReply) {
        reviewDoc.vendorReply = prev.vendorReply
        if (prev.vendorReplyAt) reviewDoc.vendorReplyAt = prev.vendorReplyAt
        if (prev.vendorReplyByUid) {
          reviewDoc.vendorReplyByUid = prev.vendorReplyByUid
        }
      }
    }

    tx.set(reviewRef, reviewDoc)

    const vendorData = vendorSnap.data() as {
      rating?: number
      reviewCount?: number
    }
    const prevCount = Math.max(0, Number(vendorData.reviewCount) || 0)
    const prevAvg = Number(vendorData.rating) || 0

    let nextCount = prevCount
    let nextAvg = prevAvg
    if (prevRating == null) {
      nextCount = prevCount + 1
      const prevSum = prevAvg * prevCount
      nextAvg = Math.round(((prevSum + rating) / nextCount) * 10) / 10
    } else if (nextCount > 0) {
      const prevSum = prevAvg * prevCount
      nextAvg =
        Math.round(((prevSum - prevRating + rating) / nextCount) * 10) / 10
    } else {
      nextCount = 1
      nextAvg = rating
    }

    tx.update(vendorRef, {
      rating: nextAvg,
      reviewCount: nextCount,
    })

    return reviewDoc
  })
}

export async function replyToVendorReviewAsOwner(input: {
  uid: string
  bookingId: string
  reply: string
}): Promise<FirestoreVendorReview> {
  const reply = input.reply.trim().slice(0, 1000)
  if (reply.length < 2) {
    throw new VendorReviewError(
      400,
      "Write a short reply (at least 2 characters)."
    )
  }

  const db = getAdminDb()
  const bookingId = input.bookingId.trim()
  const reviewRef = db.collection("vendor_reviews").doc(bookingId)

  return db.runTransaction(async (tx) => {
    const reviewSnap = await tx.get(reviewRef)
    if (!reviewSnap.exists) {
      throw new VendorReviewError(404, "Review not found.")
    }
    const existing = {
      id: reviewSnap.id,
      ...reviewSnap.data(),
    } as FirestoreVendorReview

    const vendorSnap = await tx.get(
      db.collection("vendors").doc(existing.vendorId)
    )
    if (!vendorSnap.exists) {
      throw new VendorReviewError(404, "Vendor not found.")
    }
    if (vendorSnap.data()?.ownerUid !== input.uid) {
      throw new VendorReviewError(
        403,
        "Only this vendor can reply to the review."
      )
    }

    const now = Date.now()
    const next: FirestoreVendorReview = {
      ...existing,
      vendorReply: reply,
      vendorReplyAt: now,
      vendorReplyByUid: input.uid,
      updatedAt: now,
    }
    tx.set(reviewRef, next)
    return next
  })
}

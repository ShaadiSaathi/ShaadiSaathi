"use client"

import { authenticatedFetch } from "@/lib/firebase/authenticated-fetch"
import type { FirestoreVendorReview } from "./types"

export async function upsertVendorReviewApi(input: {
  bookingId: string
  rating: number
  comment?: string
}): Promise<FirestoreVendorReview> {
  const res = await authenticatedFetch("/api/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    review?: FirestoreVendorReview
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Could not save your review.")
  }
  if (!data.review) throw new Error("Review saved but response was incomplete.")
  return data.review
}

export async function replyToVendorReviewApi(input: {
  bookingId: string
  reply: string
}): Promise<FirestoreVendorReview> {
  const res = await authenticatedFetch(
    `/api/reviews/${encodeURIComponent(input.bookingId)}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ reply: input.reply }),
    }
  )
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    review?: FirestoreVendorReview
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Could not save your reply.")
  }
  if (!data.review) throw new Error("Reply saved but response was incomplete.")
  return data.review
}

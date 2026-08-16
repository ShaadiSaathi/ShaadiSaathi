"use client"

import { getFirebaseAuth } from "@/lib/firebase/config"
import type { FirestoreVendorReview } from "./types"

async function authHeaders(): Promise<HeadersInit> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to continue.")
  const token = await user.getIdToken()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

export async function upsertVendorReviewApi(input: {
  bookingId: string
  rating: number
  comment?: string
}): Promise<FirestoreVendorReview> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: await authHeaders(),
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
  const res = await fetch(`/api/reviews/${encodeURIComponent(input.bookingId)}/reply`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ reply: input.reply }),
  })
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

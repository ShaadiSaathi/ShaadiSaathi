"use client"

import { getFirebaseAuth } from "@/lib/firebase/config"
import type { EventId } from "@/lib/mockData"
import type { InPersonMethod, PaymentPath } from "@/lib/mockPayments"
import type { BookingStatus } from "@/lib/mockVendors"

export interface CreateBookingApiInput {
  bookingId?: string
  weddingId: string
  vendorId: string
  eventId: EventId
  price: number
  packageName?: string
  guestCount?: number
  note?: string
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
  familyName?: string
  weddingName?: string
  vendorName?: string
  status?: BookingStatus
}

export interface CreateBookingApiResult {
  bookingId: string
  eventDate: string
  status: BookingStatus
}

export async function createBookingApi(
  input: CreateBookingApiInput
): Promise<CreateBookingApiResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to book a vendor.")

  const token = await user.getIdToken()
  const res = await fetch("/api/bookings/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    bookingId?: string
    eventDate?: string
    status?: BookingStatus
  }

  if (!res.ok) {
    throw new Error(data.error ?? "Could not create booking. Please try again.")
  }

  if (!data.bookingId || !data.eventDate) {
    throw new Error("Booking created but response was incomplete.")
  }

  return {
    bookingId: data.bookingId,
    eventDate: data.eventDate,
    status: data.status ?? "confirmed",
  }
}

export interface ConfirmBookingApiInput {
  price?: number
  packageName?: string
  clearCounterOffer?: boolean
}

export interface ConfirmBookingApiResult {
  bookingId: string
  eventDate: string
  status: "confirmed"
  alreadyConfirmed?: boolean
}

/** Confirm a requested booking and claim the vendor date lock (Admin API). */
export async function confirmBookingApi(
  bookingId: string,
  input: ConfirmBookingApiInput = {}
): Promise<ConfirmBookingApiResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to confirm this booking.")

  const token = await user.getIdToken()
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    bookingId?: string
    eventDate?: string
    status?: BookingStatus
    alreadyConfirmed?: boolean
  }

  if (!res.ok) {
    throw new Error(data.error ?? "Could not confirm booking. Please try again.")
  }

  if (!data.bookingId || !data.eventDate) {
    throw new Error("Booking confirmed but response was incomplete.")
  }

  return {
    bookingId: data.bookingId,
    eventDate: data.eventDate,
    status: "confirmed",
    alreadyConfirmed: data.alreadyConfirmed,
  }
}

export interface VendorCheckInApiInput {
  checkInPhoto: {
    name: string
    uploadedAt: string | number
  }
}

export interface VendorCheckInApiResult {
  bookingId: string
  checkInAt: number
  alreadyCheckedIn?: boolean
}

/** Record vendor/family check-in and release deposit (Admin API). */
export async function vendorCheckInApi(
  bookingId: string,
  input: VendorCheckInApiInput
): Promise<VendorCheckInApiResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to check in.")

  const token = await user.getIdToken()
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/check-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    bookingId?: string
    checkInAt?: number
    alreadyCheckedIn?: boolean
  }

  if (!res.ok) {
    throw new Error(data.error ?? "Could not record check-in. Please try again.")
  }

  if (!data.bookingId || typeof data.checkInAt !== "number") {
    throw new Error("Check-in recorded but response was incomplete.")
  }

  return {
    bookingId: data.bookingId,
    checkInAt: data.checkInAt,
    alreadyCheckedIn: data.alreadyCheckedIn,
  }
}

export interface CompleteBookingApiResult {
  bookingId: string
  status: "completed"
  alreadyCompleted?: boolean
}

/** Mark a booking completed and update vendor earnings (Admin API). */
export async function completeBookingApi(
  bookingId: string
): Promise<CompleteBookingApiResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to mark this job completed.")

  const token = await user.getIdToken()
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    bookingId?: string
    status?: "completed"
    alreadyCompleted?: boolean
  }

  if (!res.ok) {
    throw new Error(data.error ?? "Could not mark job completed. Please try again.")
  }

  if (!data.bookingId) {
    throw new Error("Job marked completed but response was incomplete.")
  }

  return {
    bookingId: data.bookingId,
    status: "completed",
    alreadyCompleted: data.alreadyCompleted,
  }
}

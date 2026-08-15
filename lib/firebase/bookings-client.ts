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

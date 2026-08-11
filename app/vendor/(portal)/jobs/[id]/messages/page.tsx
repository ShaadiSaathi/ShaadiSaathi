"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import BookingChat from "@/components/shaadi-saathi/chat/BookingChat"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { getBooking } from "@/lib/firebase/bookings"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import type { FirestoreBooking } from "@/lib/firebase/types"
import { EVENTS } from "@/lib/mockData"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function VendorJobMessagesPage({ params }: PageProps) {
  const { id } = use(params)
  const { vendorUser, firebaseUser, vendorId, authLoading } = useAuth()
  const [booking, setBooking] = useState<FirestoreBooking | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isFirebaseConfigured()) {
        setBooking(null)
        setError("Messaging requires Firebase.")
        return
      }
      if (authLoading) return
      if (!vendorId) {
        setBooking(null)
        setError("Sign in as a vendor to view this chat.")
        return
      }
      try {
        const doc = await getBooking(id)
        if (cancelled) return
        if (!doc) {
          setBooking(null)
          setError("Job not found.")
          return
        }
        if (doc.vendorId !== vendorId) {
          setBooking(null)
          setError("This booking belongs to another vendor.")
          return
        }
        setBooking(doc)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setBooking(null)
        setError(err instanceof Error ? err.message : "Couldn’t load chat")
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, vendorId, authLoading])

  if (authLoading || booking === undefined) {
    return <p className="text-maroon/60">Loading chat…</p>
  }

  if (!booking || error) {
    return (
      <div className="py-8">
        <p className="text-maroon/60">{error ?? "Job not found."}</p>
        <Link href="/vendor/jobs" className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon">
          ← Back to My Jobs
        </Link>
      </div>
    )
  }

  const event = EVENTS.find((e) => e.id === booking.eventId)

  return (
    <BookingChat
      bookingId={booking.id}
      backHref={`/vendor/jobs/${booking.id}`}
      backLabel="Job details"
      senderId={firebaseUser?.uid ?? vendorUser?.uid ?? "vendor-demo"}
      senderType="vendor"
      senderName={vendorUser?.businessName ?? booking.vendorName}
      otherPartyLabel={booking.familyName || "Family"}
      title={`Message ${booking.familyName || "family"}`}
      subtitle={event?.name ?? booking.weddingName}
    />
  )
}

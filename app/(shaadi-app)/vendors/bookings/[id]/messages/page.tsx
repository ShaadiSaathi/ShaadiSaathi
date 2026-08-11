"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import BookingChat from "@/components/shaadi-saathi/chat/BookingChat"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { getBooking } from "@/lib/firebase/bookings"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import type { FirestoreBooking } from "@/lib/firebase/types"
import { getVendor } from "@/lib/firebase/vendors"
import { EVENTS } from "@/lib/mockData"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function FamilyBookingMessagesPage({ params }: PageProps) {
  const { id } = use(params)
  const { familyUser, firebaseUser, weddingId, authLoading } = useAuth()
  const [booking, setBooking] = useState<FirestoreBooking | null | undefined>(undefined)
  const [vendorName, setVendorName] = useState<string>("Vendor")
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
      try {
        const doc = await getBooking(id)
        if (cancelled) return
        if (!doc) {
          setBooking(null)
          setError("Booking not found.")
          return
        }
        if (weddingId && doc.weddingId !== weddingId) {
          setBooking(null)
          setError("This booking belongs to another wedding.")
          return
        }
        setBooking(doc)
        setVendorName(doc.vendorName || "Vendor")
        const vendor = await getVendor(doc.vendorId)
        if (!cancelled && vendor?.businessName) {
          setVendorName(vendor.businessName)
        }
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
  }, [id, weddingId, authLoading])

  if (authLoading || booking === undefined) {
    return <p className="text-maroon/60">Loading chat…</p>
  }

  if (!booking || error) {
    return (
      <div className="py-8">
        <p className="text-maroon/60">{error ?? "Booking not found."}</p>
        <Link href="/vendors/bookings" className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon">
          ← Back to My Bookings
        </Link>
      </div>
    )
  }

  const event = EVENTS.find((e) => e.id === booking.eventId)

  return (
    <BookingChat
      bookingId={booking.id}
      backHref="/vendors/bookings"
      backLabel="My Bookings"
      senderId={firebaseUser?.uid ?? familyUser?.uid ?? "family-demo"}
      senderType="family"
      senderName={familyUser?.name ?? booking.familyName}
      otherPartyLabel={vendorName}
      title={`Message ${vendorName}`}
      subtitle={event ? `${event.name} booking` : undefined}
    />
  )
}

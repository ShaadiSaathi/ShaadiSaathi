"use client"

import { use } from "react"
import BookingChat from "@/components/shaadi-saathi/chat/BookingChat"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { EVENTS } from "@/lib/mockData"
import { getVendorById } from "@/lib/mockVendors"
import { useVendorBookings } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function FamilyBookingMessagesPage({ params }: PageProps) {
  const { id } = use(params)
  const { familyUser, firebaseUser } = useAuth()
  const { bookings } = useVendorBookings()
  const booking = bookings.find((b) => b.id === id)
  const vendor = booking ? getVendorById(booking.vendorId) : null
  const event = booking ? EVENTS.find((e) => e.id === booking.eventId) : null

  if (!booking || !vendor) {
    return (
      <p className="text-maroon/60">Booking not found.</p>
    )
  }

  return (
    <BookingChat
      bookingId={booking.id}
      backHref="/vendors/bookings"
      backLabel="My Bookings"
      senderId={firebaseUser?.uid ?? familyUser?.uid ?? "family-demo"}
      senderType="family"
      otherPartyLabel="Vendor"
      title={`Message ${vendor.name}`}
      subtitle={event ? `${event.name} booking` : undefined}
    />
  )
}

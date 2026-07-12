"use client"

import { use } from "react"
import BookingChat from "@/components/shaadi-saathi/chat/BookingChat"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function VendorJobMessagesPage({ params }: PageProps) {
  const { id } = use(params)
  const { vendorUser, firebaseUser } = useAuth()
  const { jobs } = useVendorPortal()
  const job = jobs.find((j) => j.id === id)

  if (!job) {
    return <p className="text-maroon/60">Job not found.</p>
  }

  return (
    <BookingChat
      bookingId={job.id}
      backHref={`/vendor/jobs/${job.id}`}
      backLabel="Job details"
      senderId={firebaseUser?.uid ?? vendorUser?.uid ?? "vendor-demo"}
      senderType="vendor"
      otherPartyLabel="Family"
      title={`Message ${job.familyName}`}
      subtitle={job.eventName}
    />
  )
}

"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import BookingChat from "@/components/shaadi-saathi/chat/BookingChat"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { getChatThread, subscribeChatThread } from "@/lib/firebase/chat-threads"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import type { FirestoreChatThread } from "@/lib/firebase/types"

interface PageProps {
  params: Promise<{ id: string }>
}

/** Vendor side of a pre-booking inquiry thread. */
export default function VendorInquiryThreadPage({ params }: PageProps) {
  const { id: threadId } = use(params)
  const { vendorUser, firebaseUser, vendorId, authLoading } = useAuth()
  const [thread, setThread] = useState<FirestoreChatThread | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setThread(null)
      setError("Messaging requires Firebase.")
      return
    }
    if (authLoading) return

    let cancelled = false
    void getChatThread(threadId).then((doc) => {
      if (cancelled) return
      if (!doc) {
        setThread(null)
        setError("Inquiry not found.")
        return
      }
      if (vendorId && doc.vendorId !== vendorId) {
        setThread(null)
        setError("This inquiry belongs to another vendor.")
        return
      }
      if (doc.type !== "vendor_inquiry") {
        setThread(null)
        setError("Unsupported thread type.")
        return
      }
      setThread(doc)
      setError(null)
    })

    const unsub = subscribeChatThread(threadId, (doc) => {
      if (!doc) return
      if (vendorId && doc.vendorId !== vendorId) return
      setThread(doc)
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [threadId, vendorId, authLoading])

  if (authLoading || thread === undefined) {
    return <p className="text-maroon/60">Loading inquiry…</p>
  }

  if (!thread || error) {
    return (
      <div className="py-8">
        <p className="text-maroon/60">{error ?? "Inquiry not found."}</p>
        <Link href="/vendor/requests" className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon">
          ← Back to requests
        </Link>
      </div>
    )
  }

  return (
    <BookingChat
      threadId={thread.id}
      markBookingRead={false}
      backHref="/vendor/requests"
      backLabel="Requests"
      senderId={firebaseUser?.uid ?? vendorUser?.uid ?? "vendor-demo"}
      senderType="vendor"
      senderName={vendorUser?.businessName ?? thread.vendorName}
      otherPartyLabel="Family"
      title="Family inquiry"
      subtitle={thread.vendorName}
    />
  )
}

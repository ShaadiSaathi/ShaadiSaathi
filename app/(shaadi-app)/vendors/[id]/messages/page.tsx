"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import BookingChat from "@/components/shaadi-saathi/chat/BookingChat"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { ensureChatThread } from "@/lib/firebase/chat-threads"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { getVendor } from "@/lib/firebase/vendors"

interface PageProps {
  params: Promise<{ id: string }>
}

/** Pre-booking family ↔ vendor inquiry chat. */
export default function VendorInquiryMessagesPage({ params }: PageProps) {
  const { id: vendorId } = use(params)
  const router = useRouter()
  const { familyUser, firebaseUser, authLoading, isFamilyLoggedIn } = useAuth()
  const { weddingId } = useWedding()
  const [threadId, setThreadId] = useState<string | null>(null)
  const [vendorName, setVendorName] = useState("Vendor")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isFirebaseConfigured()) {
        setError("Messaging requires Firebase.")
        return
      }
      if (authLoading) return
      if (!isFamilyLoggedIn || !weddingId) {
        setError("Sign in to your wedding to message vendors.")
        return
      }
      try {
        const vendor = await getVendor(vendorId)
        if (cancelled) return
        if (!vendor) {
          setError("Vendor not found.")
          return
        }
        setVendorName(vendor.businessName)
        const id = await ensureChatThread({
          type: "vendor_inquiry",
          weddingId,
          vendorId,
          vendorName: vendor.businessName,
        })
        if (!cancelled) setThreadId(id)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn’t open chat")
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [vendorId, weddingId, authLoading, isFamilyLoggedIn])

  if (authLoading || (!threadId && !error)) {
    return <p className="text-maroon/60">Opening chat…</p>
  }

  if (error || !threadId) {
    return (
      <div className="py-8">
        <p className="text-maroon/60">{error ?? "Chat unavailable."}</p>
        <button
          type="button"
          onClick={() => router.push(`/vendors/${vendorId}`)}
          className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon"
        >
          ← Back to vendor
        </button>
      </div>
    )
  }

  return (
    <BookingChat
      threadId={threadId}
      markBookingRead={false}
      backHref={`/vendors/${vendorId}`}
      backLabel="Vendor profile"
      senderId={firebaseUser?.uid ?? familyUser?.uid ?? "family-demo"}
      senderType="family"
      senderName={familyUser?.name}
      otherPartyLabel={vendorName}
      title={`Message ${vendorName}`}
      subtitle="Pre-booking inquiry"
    />
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Vendor } from "@/lib/mockVendors"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { ensureChatThread } from "@/lib/firebase/chat-threads"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { sendMessage } from "@/lib/firebase/messages"

interface MessageModalProps {
  vendor: Vendor
  onClose: () => void
}

/** Pre-booking contact modal — writes a real inquiry thread + first message. */
export default function MessageModal({ vendor, onClose }: MessageModalProps) {
  const router = useRouter()
  const { familyUser, firebaseUser, isFamilyLoggedIn } = useAuth()
  const { weddingId } = useWedding()
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending) return

    if (!isFirebaseConfigured()) {
      setError("Messaging requires Firebase.")
      return
    }
    if (!isFamilyLoggedIn || !weddingId) {
      setError("Sign in to your wedding account to message vendors.")
      return
    }

    setSending(true)
    setError(null)
    try {
      const threadId = await ensureChatThread({
        type: "vendor_inquiry",
        weddingId,
        vendorId: vendor.id,
        vendorName: vendor.name,
      })
      await sendMessage({
        threadId,
        senderId: firebaseUser?.uid ?? familyUser?.uid ?? "family",
        senderType: "family",
        senderName: familyUser?.name,
        text: trimmed,
      })
      onClose()
      router.push(`/vendors/${vendor.id}/messages`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 md:items-center md:p-4"
      role="dialog"
      aria-labelledby="message-modal-title"
      aria-modal="true"
    >
      <div className="safe-bottom relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gold/25 bg-ivory shadow-xl md:max-h-[90vh] md:max-w-md md:rounded-2xl md:pb-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-maroon/50 transition-colors hover:bg-maroon/5 hover:text-maroon"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex shrink-0 justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-maroon/15" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <h2 id="message-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
            Message {vendor.name}
          </h2>
          <p className="mt-1 text-sm text-maroon/60">
            Starts a real chat — they’ll see it in their vendor inbox.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="vendor-message" className="block text-sm font-medium text-maroon/70">
                Your message
              </label>
              <textarea
                id="vendor-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi, we're planning our walima and would love to know..."
                className="mt-1 w-full resize-none rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
              />
            </div>
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <GoldButton type="submit" disabled={sending} className="min-h-[44px] flex-1">
                {sending ? "Sending…" : "Send"}
              </GoldButton>
              <GoldButton type="button" variant="ghost" onClick={onClose} className="min-h-[44px] flex-1">
                Cancel
              </GoldButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

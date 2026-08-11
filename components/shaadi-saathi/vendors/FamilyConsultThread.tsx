"use client"

import { useEffect, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { ensureChatThread } from "@/lib/firebase/chat-threads"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  sendMessage,
  subscribeThreadMessages,
  type ChatMessage,
} from "@/lib/firebase/messages"
import type { Vendor } from "@/lib/mockVendors"

interface FamilyConsultThreadProps {
  vendor: Vendor
  onProceed: () => void
}

/** Family-only thread about a vendor before booking. */
export default function FamilyConsultThread({ vendor, onProceed }: FamilyConsultThreadProps) {
  const { familyUser, firebaseUser, isFamilyLoggedIn } = useAuth()
  const { weddingId } = useWedding()
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState("")
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded || !isFirebaseConfigured() || !weddingId || !isFamilyLoggedIn) return
    let cancelled = false
    let unsub: (() => void) | undefined

    void ensureChatThread({
      type: "family_consult",
      weddingId,
      vendorId: vendor.id,
      vendorName: vendor.name,
    })
      .then((id) => {
        if (cancelled) return
        setThreadId(id)
        unsub = subscribeThreadMessages(id, setMessages)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn’t open family thread")
        }
      })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [expanded, weddingId, vendor.id, vendor.name, isFamilyLoggedIn])

  async function handleAddComment() {
    if (!comment.trim() || posting) return
    if (!isFirebaseConfigured() || !weddingId || !isFamilyLoggedIn) {
      setError("Sign in to post for your family.")
      return
    }
    setPosting(true)
    setError(null)
    try {
      const id =
        threadId ??
        (await ensureChatThread({
          type: "family_consult",
          weddingId,
          vendorId: vendor.id,
          vendorName: vendor.name,
        }))
      setThreadId(id)
      await sendMessage({
        threadId: id,
        senderId: firebaseUser?.uid ?? familyUser?.uid ?? "family",
        senderType: "family",
        senderName: familyUser?.name ?? "Family",
        text: comment.trim(),
      })
      setComment("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t post")
    } finally {
      setPosting(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-gold/25 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-maroon-dark">
            Ask family first
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-maroon/60">
            Optional — get a quick reaction from family members before you book {vendor.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
        >
          {expanded ? "Hide" : "Open thread"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-maroon/45">No family comments yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-xl bg-ivory px-3 py-2 text-sm">
                <p className="font-semibold text-maroon-dark">{m.senderName ?? "Family"}</p>
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" className="mt-1 max-h-40 rounded-lg object-cover" />
                ) : null}
                {m.text && m.text !== "📷 Photo" ? <p className="text-maroon/70">{m.text}</p> : null}
              </div>
            ))
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comment..."
              className="min-h-[44px] flex-1 rounded-xl border border-gold/25 bg-ivory px-3 py-2.5 text-sm text-maroon-dark focus:border-maroon focus:outline-none"
            />
            <GoldButton
              type="button"
              onClick={() => void handleAddComment()}
              disabled={posting || !comment.trim()}
              className="min-h-[44px] shrink-0"
            >
              Post
            </GoldButton>
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <GoldButton onClick={onProceed} className="min-h-[44px]">Proceed to book</GoldButton>
        <GoldButton variant="ghost" onClick={onProceed} className="min-h-[44px]">
          Skip — book now
        </GoldButton>
      </div>
    </section>
  )
}

"use client"

import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { FAMILY_MEMBERS } from "@/lib/mockData"
import type { Vendor } from "@/lib/mockVendors"

const MOCK_COMMENTS = [
  { memberId: "user-sana", text: "Love their mehndi spreads — we used them for my cousin's wedding!", at: "2026-07-08" },
  { memberId: "user-uncle-rashid", text: "Price seems fair. Can we see a sample menu?", at: "2026-07-09" },
]

interface FamilyConsultThreadProps {
  vendor: Vendor
  onProceed: () => void
}

/** Optional "Ask family first" thread before booking */
export default function FamilyConsultThread({ vendor, onProceed }: FamilyConsultThreadProps) {
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState("")
  const [localComments, setLocalComments] = useState(MOCK_COMMENTS)

  function handleAddComment() {
    if (!comment.trim()) return
    setLocalComments((prev) => [
      ...prev,
      { memberId: "user-ayesha", text: comment.trim(), at: "2026-07-11" },
    ])
    setComment("")
  }

  return (
    <section className="mb-6 rounded-2xl border border-gold/25 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-maroon-dark">
            Ask family first
          </h2>
          <p className="mt-1 text-sm text-maroon/60">
            Optional — get a quick reaction from family members before you book {vendor.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold text-maroon hover:text-gold-dark"
        >
          {expanded ? "Hide" : "Open thread"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {localComments.map((c, i) => {
            const member = FAMILY_MEMBERS.find((m) => m.id === c.memberId)
            return (
              <div key={i} className="rounded-xl bg-ivory px-3 py-2 text-sm">
                <p className="font-semibold text-maroon-dark">{member?.name ?? "Family"}</p>
                <p className="text-maroon/70">{c.text}</p>
              </div>
            )
          })}
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comment..."
              className="flex-1 rounded-xl border border-gold/25 bg-ivory px-3 py-2 text-sm text-maroon-dark focus:border-maroon focus:outline-none"
            />
            <GoldButton type="button" onClick={handleAddComment} className="shrink-0">
              Post
            </GoldButton>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <GoldButton onClick={onProceed}>Proceed to book</GoldButton>
        <GoldButton variant="ghost" onClick={onProceed}>
          Skip — book now
        </GoldButton>
      </div>
    </section>
  )
}

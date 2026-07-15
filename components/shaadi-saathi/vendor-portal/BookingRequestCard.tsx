"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { formatPrice } from "@/lib/mockVendors"
import type { BookingRequest } from "@/lib/mockVendorPortal"

interface BookingRequestCardProps {
  request: BookingRequest
  onAccept: () => void
  onDecline: () => void
  onProposeChanges?: (data: { price: number; packageName?: string; note?: string }) => void
  onMessage?: () => void
  accepted?: boolean
  declining?: boolean
}

/** Incoming booking request — accept / decline / propose changes */
export default function BookingRequestCard({
  request,
  onAccept,
  onDecline,
  onProposeChanges,
  onMessage,
  accepted,
  declining,
}: BookingRequestCardProps) {
  const [showPropose, setShowPropose] = useState(false)
  const [proposedPrice, setProposedPrice] = useState(request.proposedPrice)
  const [proposedPackage, setProposedPackage] = useState(request.packageName ?? "")
  const [proposedNote, setProposedNote] = useState("")

  if (request.status === "awaiting_family_response" && request.counterOffer) {
    return (
      <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <p className="text-sm font-semibold text-amber-900">
          Awaiting family response to your counter-offer
        </p>
        <p className="mt-1 text-sm text-amber-800">
          {request.familyName} — {formatPrice(request.counterOffer.price)}
          {request.counterOffer.packageName && ` · ${request.counterOffer.packageName}`}
        </p>
        {request.counterOffer.note && (
          <p className="mt-2 text-xs text-amber-700">{request.counterOffer.note}</p>
        )}
      </article>
    )
  }

  if (accepted) {
    return (
      <motion.div
        layout
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        role="status"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-emerald-900">Booking accepted!</p>
            <p className="text-sm text-emerald-700">
              {request.familyName} — {request.eventName} added to My Jobs.
            </p>
          </div>
        </div>
        <Link
          href="/vendor/jobs"
          className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline"
        >
          View in My Jobs →
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.article
      layout
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border border-gold/25 bg-white p-5 shadow-sm ${
        declining ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-maroon-dark">
            {request.familyName}
          </h3>
          <p className="text-sm text-maroon/60">{request.weddingName}</p>
        </div>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-maroon">
          {request.eventName}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-maroon/50">Date</dt>
          <dd className="font-medium text-maroon-dark">
            {new Date(request.eventDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-maroon/50">Venue</dt>
          <dd className="font-medium text-maroon-dark">{request.venue}</dd>
        </div>
        {request.guestCount && (
          <div>
            <dt className="text-maroon/50">Guests</dt>
            <dd className="font-medium text-maroon-dark">{request.guestCount}</dd>
          </div>
        )}
        {request.packageName && (
          <div>
            <dt className="text-maroon/50">Package</dt>
            <dd className="font-medium text-maroon-dark">{request.packageName}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-maroon/50">Proposed price</dt>
          <dd className="font-display text-xl font-bold text-maroon-dark">
            {formatPrice(request.proposedPrice)}
          </dd>
        </div>
      </dl>

      {request.note && (
        <p className="mt-3 rounded-xl bg-ivory px-3 py-2 text-sm text-maroon/70">
          <span className="font-medium text-maroon/80">Note: </span>
          {request.note}
        </p>
      )}

      {showPropose && onProposeChanges && (
        <div className="mt-4 space-y-3 rounded-xl border border-gold/25 bg-ivory p-4">
          <p className="text-sm font-semibold text-maroon-dark">Propose changes</p>
          <label className="block text-xs text-maroon/60">
            Revised price
            <input
              type="number"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(Number(e.target.value))}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-gold/25 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-maroon/60">
            Package (optional)
            <input
              type="text"
              value={proposedPackage}
              onChange={(e) => setProposedPackage(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-gold/25 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-maroon/60">
            Note to family
            <textarea
              rows={2}
              value={proposedNote}
              onChange={(e) => setProposedNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gold/25 px-3 py-2 text-sm"
              placeholder="Explain your revised offer..."
            />
          </label>
          <GoldButton
            onClick={() => {
              onProposeChanges({
                price: proposedPrice,
                packageName: proposedPackage || undefined,
                note: proposedNote || undefined,
              })
              setShowPropose(false)
            }}
          >
            Send counter-offer
          </GoldButton>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <GoldButton onClick={onAccept} disabled={declining}>
          Accept
        </GoldButton>
        <GoldButton variant="ghost" onClick={onDecline} disabled={declining}>
          Decline
        </GoldButton>
        {onProposeChanges && (request.negotiationRound ?? 0) < 1 && (
          <button
            type="button"
            onClick={() => setShowPropose(!showPropose)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-maroon/70 hover:bg-maroon/5"
          >
            Propose changes
          </button>
        )}
        {onMessage && (
          <button
            type="button"
            onClick={onMessage}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-maroon/70 hover:bg-maroon/5"
          >
            Message Family
          </button>
        )}
      </div>
    </motion.article>
  )
}

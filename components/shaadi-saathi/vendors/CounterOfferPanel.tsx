"use client"

import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { formatPrice } from "@/lib/mockVendors"
import type { VendorBooking } from "@/lib/mockVendors"

interface CounterOfferPanelProps {
  booking: VendorBooking
  vendorName: string
  onAccept: () => void
  onDecline: () => void
  onCounter: (price: number, note?: string) => void
}

/** Family responds to vendor counter-offer */
export default function CounterOfferPanel({
  booking,
  vendorName,
  onAccept,
  onDecline,
  onCounter,
}: CounterOfferPanelProps) {
  const [showCounter, setShowCounter] = useState(false)
  const [counterPrice, setCounterPrice] = useState(
    booking.counterOffer ? Math.round(booking.counterOffer.price * 0.95) : booking.price
  )
  const offer = booking.counterOffer
  if (!offer || offer.proposedBy !== "vendor") return null

  const canCounter = (booking.negotiationRound ?? 0) < 2

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
      <p className="text-sm font-semibold text-amber-900">
        Awaiting your response to {vendorName}&apos;s counter-offer
      </p>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-amber-800/70">Revised price</dt>
          <dd className="font-bold text-maroon-dark">{formatPrice(offer.price)}</dd>
        </div>
        {offer.packageName && (
          <div className="flex justify-between">
            <dt className="text-amber-800/70">Package</dt>
            <dd className="text-maroon-dark">{offer.packageName}</dd>
          </div>
        )}
        {offer.note && <p className="text-xs text-amber-800/80">{offer.note}</p>}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <GoldButton onClick={onAccept} className="min-h-[44px]">Accept offer</GoldButton>
        <GoldButton variant="ghost" onClick={onDecline} className="min-h-[44px]">
          Decline
        </GoldButton>
        {canCounter && (
          <button
            type="button"
            onClick={() => setShowCounter(!showCounter)}
            className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-maroon/70 hover:text-maroon"
          >
            Send counter
          </button>
        )}
      </div>
      {showCounter && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-amber-200/50 pt-3">
          <label className="text-xs text-maroon/60">
            Your price
            <input
              type="number"
              value={counterPrice}
              onChange={(e) => setCounterPrice(Number(e.target.value))}
              className="mt-1 block min-h-[44px] w-32 rounded-lg border border-gold/25 px-3 py-2.5 text-sm"
            />
          </label>
          <GoldButton onClick={() => onCounter(counterPrice)} className="min-h-[44px]">Send counter</GoldButton>
        </div>
      )}
    </div>
  )
}

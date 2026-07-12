"use client"

import { useState } from "react"
import type { BookingPayment } from "@/lib/mockPayments"
import { formatPrice } from "@/lib/mockVendors"
import { WEDDING_DAY_GUARANTEE } from "@/lib/mockPayments"

interface DepositBalanceCardProps {
  payment: BookingPayment
  compact?: boolean
}

/** Clearly separates deposit (due now) from balance (due later) */
export default function DepositBalanceCard({ payment, compact = false }: DepositBalanceCardProps) {
  const [showGuarantee, setShowGuarantee] = useState(false)

  return (
    <div
      className={`rounded-xl border border-gold/25 bg-gold/5 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-maroon/50">
              Deposit due now
            </p>
            <p className={`font-display font-bold text-maroon-dark ${compact ? "text-lg" : "text-xl"}`}>
              {formatPrice(payment.depositAmount)}
            </p>
            <p className="text-xs text-maroon/50">
              {Math.round(payment.depositPercent * 100)}% of total — held until vendor check-in
            </p>
          </div>
          <GuaranteeBadge onToggle={() => setShowGuarantee(!showGuarantee)} />
        </div>

        <div className="border-t border-gold/15 pt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-maroon/50">
            Balance due later
          </p>
          <p className={`font-semibold text-maroon-dark ${compact ? "text-base" : "text-lg"}`}>
            {formatPrice(payment.balanceAmount)}
          </p>
        </div>
      </div>

      {showGuarantee && (
        <p className="mt-3 rounded-lg bg-white/80 p-3 text-xs leading-relaxed text-maroon/70">
          {WEDDING_DAY_GUARANTEE.description}
        </p>
      )}
    </div>
  )
}

export function GuaranteeBadge({ onToggle }: { onToggle?: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 rounded-full border border-gold/30 bg-white px-2 py-1 text-[10px] font-semibold text-gold-dark hover:bg-gold/10"
      title={WEDDING_DAY_GUARANTEE.description}
    >
      🛡 {WEDDING_DAY_GUARANTEE.short}
    </button>
  )
}

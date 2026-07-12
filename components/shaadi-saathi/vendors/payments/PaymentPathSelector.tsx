"use client"

import { useState } from "react"
import type { InPersonMethod, PaymentPath } from "@/lib/mockPayments"

interface PaymentPathSelectorProps {
  paymentPath: PaymentPath
  inPersonMethod: InPersonMethod
  onPathChange: (path: PaymentPath) => void
  onMethodChange: (method: InPersonMethod) => void
  /** Hide card option when vendor doesn't accept in-person card */
  acceptsCardInPerson?: boolean
}

/** Two-card choice: Pay in Person vs Pay Online */
export default function PaymentPathSelector({
  paymentPath,
  inPersonMethod,
  onPathChange,
  onMethodChange,
  acceptsCardInPerson = false,
}: PaymentPathSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-maroon/70">
        How will you pay the balance?
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPathChange("in_person")}
          className={`rounded-xl border p-4 text-left transition-all ${
            paymentPath === "in_person"
              ? "border-maroon bg-maroon/5 shadow-sm"
              : "border-gold/20 bg-white hover:border-gold/40"
          }`}
          aria-pressed={paymentPath === "in_person"}
        >
          <p className="font-display font-semibold text-maroon-dark">Pay in Person</p>
          <p className="mt-1 text-xs leading-relaxed text-maroon/60">
            Settle the balance with the vendor on the event day — cash by default.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onPathChange("online")}
          className={`rounded-xl border p-4 text-left transition-all ${
            paymentPath === "online"
              ? "border-maroon bg-maroon/5 shadow-sm"
              : "border-gold/20 bg-white hover:border-gold/40"
          }`}
          aria-pressed={paymentPath === "online"}
        >
          <p className="font-display font-semibold text-maroon-dark">Pay Online</p>
          <p className="mt-1 text-xs leading-relaxed text-maroon/60">
            Deposit now; balance charged close to the event via JazzCash, Easypaisa, or card.
          </p>
        </button>
      </div>

      {paymentPath === "in_person" && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2" role="group" aria-label="In-person payment method">
            <button
              type="button"
              onClick={() => onMethodChange("cash")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                inPersonMethod === "cash"
                  ? "border-maroon bg-maroon text-ivory"
                  : "border-gold/25 text-maroon/70 hover:border-gold/40"
              }`}
              aria-pressed={inPersonMethod === "cash"}
            >
              Cash
            </button>
            {acceptsCardInPerson && (
              <button
                type="button"
                onClick={() => onMethodChange("card")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  inPersonMethod === "card"
                    ? "border-maroon bg-maroon text-ivory"
                    : "border-gold/25 text-maroon/70 hover:border-gold/40"
                }`}
                aria-pressed={inPersonMethod === "card"}
              >
                Card
              </button>
            )}
          </div>
          {acceptsCardInPerson ? (
            <p className="text-xs text-maroon/50">
              Card available if this vendor supports it — most vendors prefer cash.
            </p>
          ) : (
            <p className="text-xs text-maroon/50">
              This vendor accepts cash on the event day.
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}

/** Mock deposit payment step — PLACEHOLDER for Safepay/JazzCash/Easypaisa */
export function MockDepositPayment({
  depositAmount,
  onPaid,
}: {
  depositAmount: number
  onPaid: (providerId: string) => void
}) {
  const [provider, setProvider] = useState("jazzcash")

  return (
    <div className="space-y-3 rounded-xl border border-gold/25 bg-white p-4">
      <p className="text-sm font-medium text-maroon-dark">
        Pay deposit now
      </p>
      <div className="space-y-2">
        {[
          { id: "jazzcash", label: "JazzCash" },
          { id: "easypaisa", label: "Easypaisa" },
          { id: "card", label: "Debit / Credit Card" },
        ].map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
              provider === p.id ? "border-maroon bg-maroon/5" : "border-gold/15"
            }`}
          >
            <input
              type="radio"
              name="payment-provider"
              value={p.id}
              checked={provider === p.id}
              onChange={() => setProvider(p.id)}
              className="text-maroon"
            />
            <span className="text-sm font-medium text-maroon-dark">{p.label}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onPaid(provider)}
        className="w-full rounded-full bg-gold py-2.5 text-sm font-semibold text-maroon-dark shadow-sm"
      >
        Pay Rs. {depositAmount.toLocaleString("en-PK")} (mock)
      </button>
    </div>
  )
}

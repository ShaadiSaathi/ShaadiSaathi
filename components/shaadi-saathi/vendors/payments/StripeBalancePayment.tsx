"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import { createBalanceIntent, fetchPaymentsStatus } from "@/lib/payments/client"
import { PAYMENTS_UNAVAILABLE_MESSAGE } from "@/lib/payments/types"
import { formatPrice } from "@/lib/mockVendors"
import { useWeddingMembersOptional } from "@/components/shaadi-saathi/family/WeddingMembersContext"
import PaymentOwnerOnlyNotice from "./PaymentOwnerOnlyNotice"

let stripePromiseCache: Promise<Stripe | null> | null = null
let stripePromiseKey: string | null = null

function getStripePromise(publishableKey: string) {
  if (stripePromiseKey !== publishableKey) {
    stripePromiseKey = publishableKey
    stripePromiseCache = loadStripe(publishableKey)
  }
  return stripePromiseCache
}

function BalanceForm({
  amountPkr,
  onPaid,
  onError,
}: {
  amountPkr: number
  onPaid: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: typeof window !== "undefined" ? window.location.href : undefined,
      },
    })
    setSubmitting(false)
    if (error) {
      onError(error.message ?? "Payment failed")
      return
    }
    if (paymentIntent?.status !== "succeeded") {
      onError(`Unexpected status: ${paymentIntent?.status ?? "unknown"}`)
      return
    }
    onPaid()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-full bg-gold py-2.5 text-sm font-semibold text-maroon-dark disabled:opacity-60"
      >
        {submitting ? "Processing…" : `Pay balance ${formatPrice(amountPkr)} (test)`}
      </button>
    </form>
  )
}

/** Collect online balance when due — owner-only; collaborators see a read-only notice. */
export default function StripeBalancePayment({
  bookingId,
  amountPkr,
  onPaid,
}: {
  bookingId: string
  amountPkr: number
  onPaid: () => void
}) {
  const membersCtx = useWeddingMembersOptional()
  const canApprovePayments = membersCtx?.canApprovePayments === true
  const ownerDisplayName = membersCtx?.ownerDisplayName ?? "the wedding owner"

  if (membersCtx && !canApprovePayments) {
    return <PaymentOwnerOnlyNotice ownerName={ownerDisplayName} />
  }

  return (
    <StripeBalancePaymentInner
      bookingId={bookingId}
      amountPkr={amountPkr}
      onPaid={onPaid}
    />
  )
}

function StripeBalancePaymentInner({
  bookingId,
  amountPkr,
  onPaid,
}: {
  bookingId: string
  amountPkr: number
  onPaid: () => void
}) {
  const [error, setError] = useState("")
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function start() {
    setLoading(true)
    setError("")
    try {
      const status = await fetchPaymentsStatus()
      if (!status.canCollect || !status.publishableKey) {
        setUnavailable(status.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
        return
      }
      const intent = await createBalanceIntent({ bookingId })
      setClientSecret(intent.clientSecret)
      setPublishableKey(intent.publishableKey)
      setStarted(true)
    } catch (err) {
      setUnavailable(err instanceof Error ? err.message : PAYMENTS_UNAVAILABLE_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  if (unavailable) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-semibold">Payments are not yet available</p>
        <p className="mt-1 text-amber-900/80">{unavailable}</p>
      </div>
    )
  }

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => void start()}
        disabled={loading}
        className="w-full rounded-full border border-maroon/20 bg-white py-2.5 text-sm font-semibold text-maroon-dark disabled:opacity-60"
      >
        {loading ? "Preparing…" : `Pay balance online ${formatPrice(amountPkr)}`}
      </button>
    )
  }

  if (!clientSecret || !publishableKey) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
        Payments are not yet available
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-gold/25 bg-white p-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <Elements
        stripe={getStripePromise(publishableKey)}
        options={{ clientSecret }}
      >
        <BalanceForm amountPkr={amountPkr} onPaid={onPaid} onError={setError} />
      </Elements>
    </div>
  )
}

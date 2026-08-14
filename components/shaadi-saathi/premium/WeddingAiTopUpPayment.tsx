"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * One-time Wedding AI daily top-up via Stripe Payment Element (test mode).
 */

import { useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import {
  completeAiTopUp,
  createAiTopUpIntent,
  fetchPaymentsStatus,
  type WeddingAiUsageClient,
} from "@/lib/payments/client"
import { PAYMENTS_UNAVAILABLE_MESSAGE } from "@/lib/payments/types"
import {
  WEDDING_AI_TOPUP_AMOUNT_MAJOR,
  WEDDING_AI_TOPUP_QUESTIONS,
} from "@/lib/wedding-ai-limits"

let stripePromiseCache: Promise<Stripe | null> | null = null
let stripePromiseKey: string | null = null

function getStripePromise(publishableKey: string) {
  if (stripePromiseKey !== publishableKey) {
    stripePromiseKey = publishableKey
    stripePromiseCache = loadStripe(publishableKey)
  }
  return stripePromiseCache
}

function TopUpForm({
  paymentIntentId,
  onPaid,
  onError,
}: {
  paymentIntentId: string
  onPaid: (usage: WeddingAiUsageClient) => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url:
            typeof window !== "undefined" ? window.location.href : undefined,
        },
      })
      if (error) {
        onError(error.message ?? "Payment failed")
        return
      }
      if (paymentIntent?.status !== "succeeded") {
        onError(`Unexpected status: ${paymentIntent?.status ?? "unknown"}`)
        return
      }
      const usage = await completeAiTopUp({
        paymentIntentId: paymentIntent.id || paymentIntentId,
      })
      onPaid(usage)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-full bg-maroon py-2.5 font-sans text-sm font-semibold text-ivory disabled:opacity-60"
      >
        {submitting
          ? "Processing…"
          : `Pay £${WEDDING_AI_TOPUP_AMOUNT_MAJOR} for +${WEDDING_AI_TOPUP_QUESTIONS} questions`}
      </button>
    </form>
  )
}

export default function WeddingAiTopUpPayment({
  onPaid,
  onCancel,
}: {
  onPaid: (usage: WeddingAiUsageClient) => void
  onCancel?: () => void
}) {
  const [error, setError] = useState("")
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)

  async function start() {
    setLoading(true)
    setError("")
    setUnavailable(null)
    try {
      const status = await fetchPaymentsStatus()
      if (!status.canCollect || !status.publishableKey) {
        setUnavailable(status.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
        return
      }
      const intent = await createAiTopUpIntent()
      setClientSecret(intent.clientSecret)
      setPublishableKey(intent.publishableKey)
      setPaymentIntentId(intent.paymentIntentId)
      setStarted(true)
    } catch (err) {
      setUnavailable(
        err instanceof Error ? err.message : PAYMENTS_UNAVAILABLE_MESSAGE
      )
    } finally {
      setLoading(false)
    }
  }

  if (unavailable) {
    return (
      <div className="rounded-2xl bg-amber-50/90 px-4 py-3 font-sans text-sm text-amber-950/85">
        <p className="font-semibold">Payments are not yet available</p>
        <p className="mt-1 text-amber-900/80">{unavailable}</p>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 font-medium text-maroon underline decoration-gold/40 underline-offset-2"
          >
            Close
          </button>
        ) : null}
      </div>
    )
  }

  if (!started) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-sm leading-relaxed text-maroon/70">
          Add {WEDDING_AI_TOPUP_QUESTIONS} more questions for today for £
          {WEDDING_AI_TOPUP_AMOUNT_MAJOR}. One-time purchase — no subscription.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void start()}
            disabled={loading}
            className="rounded-full bg-maroon px-5 py-2.5 font-sans text-sm font-medium text-ivory shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
          >
            {loading
              ? "Preparing…"
              : `Buy +${WEDDING_AI_TOPUP_QUESTIONS} questions — £${WEDDING_AI_TOPUP_AMOUNT_MAJOR}`}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-2.5 font-sans text-sm font-medium text-maroon/60 transition hover:text-maroon"
            >
              Not now
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  if (!clientSecret || !publishableKey || !paymentIntentId) {
    return (
      <div className="rounded-2xl bg-amber-50/90 px-4 py-3 font-sans text-sm text-amber-950/85">
        Payments are not yet available
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white/90 p-4 ring-1 ring-maroon/10">
      <p className="font-sans text-sm font-medium text-maroon-dark">
        +{WEDDING_AI_TOPUP_QUESTIONS} questions · £{WEDDING_AI_TOPUP_AMOUNT_MAJOR}
      </p>
      {error ? (
        <p className="font-sans text-sm text-rose-700">{error}</p>
      ) : null}
      <Elements
        stripe={getStripePromise(publishableKey)}
        options={{ clientSecret }}
      >
        <TopUpForm
          paymentIntentId={paymentIntentId}
          onPaid={onPaid}
          onError={setError}
        />
      </Elements>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-xs text-maroon/45 underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      ) : null}
    </div>
  )
}

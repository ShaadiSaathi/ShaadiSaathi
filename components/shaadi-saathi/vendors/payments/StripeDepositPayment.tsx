"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Family deposit UI. Uses Stripe Payment Element in TEST MODE when configured;
 * otherwise shows a clear "Payments are not yet available" state — never a
 * silent mock success.
 */

import { useEffect, useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import {
  completeDepositBooking,
  createDepositIntent,
  fetchPaymentsStatus,
  type CreateDepositIntentBody,
} from "@/lib/payments/client"
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

function DepositCheckoutForm({
  depositAmount,
  onPaid,
  onError,
}: {
  depositAmount: number
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
    onError("")
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: typeof window !== "undefined" ? window.location.href : undefined,
      },
    })

    if (error) {
      setSubmitting(false)
      onError(error.message ?? "Payment failed. Try a Stripe test card.")
      return
    }

    const status = paymentIntent?.status
    if (status !== "succeeded" && status !== "requires_capture") {
      setSubmitting(false)
      onError(`Unexpected payment status: ${status ?? "unknown"}`)
      return
    }

    onPaid()
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-full bg-gold py-2.5 text-sm font-semibold text-maroon-dark shadow-sm disabled:opacity-60"
      >
        {submitting
          ? "Processing…"
          : `Pay deposit ${formatPrice(depositAmount)} (test mode)`}
      </button>
      <p className="text-xs text-maroon/50">
        Test cards only — e.g.{" "}
        <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any
        CVC. Never use a real card here.
      </p>
    </form>
  )
}

export type DepositBookingDraft = Omit<CreateDepositIntentBody, "bookingId" | "amountPkr"> & {
  amountPkr: number
}

/** Stripe deposit collection — owner-only; collaborators see a read-only notice. */
export default function StripeDepositPayment({
  draft,
  onPaid,
}: {
  draft: DepositBookingDraft
  onPaid: (result: { bookingId: string; paymentIntentId: string }) => void
}) {
  const membersCtx = useWeddingMembersOptional()
  const canApprovePayments = membersCtx?.canApprovePayments === true
  const ownerDisplayName = membersCtx?.ownerDisplayName ?? "the wedding owner"

  if (membersCtx && !canApprovePayments) {
    return <PaymentOwnerOnlyNotice ownerName={ownerDisplayName} />
  }

  return (
    <StripeDepositPaymentInner draft={draft} onPaid={onPaid} />
  )
}

function StripeDepositPaymentInner({
  draft,
  onPaid,
}: {
  draft: DepositBookingDraft
  onPaid: (result: { bookingId: string; paymentIntentId: string }) => void
}) {
  const [phase, setPhase] = useState<"loading" | "unavailable" | "ready" | "confirming">(
    "loading"
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const status = await fetchPaymentsStatus()
        if (cancelled) return

        if (!status.canCollect || !status.publishableKey) {
          setMessage(status.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
          setPhase("unavailable")
          return
        }

        const id = `booking-${Date.now()}`
        const intent = await createDepositIntent({
          ...draft,
          bookingId: id,
          amountPkr: draft.amountPkr,
        })
        if (cancelled) return

        setBookingId(id)
        setPaymentIntentId(intent.paymentIntentId)
        setClientSecret(intent.clientSecret)
        setPublishableKey(intent.publishableKey)
        setPhase("ready")
      } catch (err) {
        if (cancelled) return
        setMessage(err instanceof Error ? err.message : PAYMENTS_UNAVAILABLE_MESSAGE)
        setPhase("unavailable")
      }
    }

    void start()
    return () => {
      cancelled = true
    }
    // Intentionally once per mount for this booking draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePaid() {
    if (!bookingId || !paymentIntentId) return
    setPhase("confirming")
    setError("")
    try {
      await completeDepositBooking({ bookingId, paymentIntentId })
      onPaid({ bookingId, paymentIntentId })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm deposit")
      setPhase("ready")
    }
  }

  if (phase === "loading") {
    return (
      <div className="rounded-xl border border-gold/25 bg-white p-4 text-sm text-maroon/70">
        Checking payment availability…
      </div>
    )
  }

  if (phase === "unavailable") {
    return (
      <div
        className="rounded-xl border border-amber-300 bg-amber-50 p-4"
        role="alert"
      >
        <p className="text-sm font-semibold text-amber-950">
          Payments are not yet available
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
          {message ?? PAYMENTS_UNAVAILABLE_MESSAGE}
        </p>
        <p className="mt-2 text-xs text-amber-900/60">
          Add Stripe <span className="font-mono">sk_test_</span> /{" "}
          <span className="font-mono">pk_test_</span> keys on staging to enable deposits.
          Live keys are blocked until explicit production sign-off.
        </p>
      </div>
    )
  }

  if (!clientSecret || !publishableKey) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Payments are not yet available
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-gold/25 bg-white p-4">
      <p className="text-sm font-medium text-maroon-dark">Pay deposit now (Stripe test mode)</p>
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      <Elements
        stripe={getStripePromise(publishableKey)}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#7a1f2b",
            },
          },
        }}
      >
        <DepositCheckoutForm
          depositAmount={draft.amountPkr}
          onPaid={() => void handlePaid()}
          onError={setError}
        />
      </Elements>
      {phase === "confirming" ? (
        <p className="text-sm text-maroon/60">Confirming booking…</p>
      ) : null}
    </div>
  )
}

/** @deprecated Use StripeDepositPayment — kept name export for gradual migration */
export function MockDepositPayment({
  depositAmount: _depositAmount,
  onPaid: _onPaid,
}: {
  depositAmount: number
  onPaid: (providerId: string) => void
}) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert">
      <p className="text-sm font-semibold text-amber-950">Payments are not yet available</p>
      <p className="mt-2 text-sm text-amber-900/80">{PAYMENTS_UNAVAILABLE_MESSAGE}</p>
    </div>
  )
}

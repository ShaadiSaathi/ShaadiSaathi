"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPORARY STRIPE TEST HARNESS — DELETE AFTER STAGING E2E WORKS
 * ═══════════════════════════════════════════════════════════════════════════
 * Isolated deposit test page. No sign-in / booking flow. Uses the same
 * collectDeposit() server path as real bookings. Production Firebase is blocked.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, type Stripe } from "@stripe/stripe-js"

type HarnessStatus = {
  ok: boolean
  temporary?: boolean
  firebaseProjectId?: string | null
  currency?: string
  minAmountPkr?: number
  message?: string | null
  publishableKey?: string | null
}

type IntentResponse = {
  bookingId: string
  clientSecret: string
  paymentIntentId: string
  publishableKey: string
  currency: string
  amountPkr: number
  stripeStatus: string
  depositStatusIfSucceeded: string
  message?: string
}

type ResultPanel = {
  tone: "success" | "error" | "info"
  title: string
  lines: string[]
}

let stripePromiseCache: Promise<Stripe | null> | null = null
let stripePromiseKey: string | null = null

function getStripePromise(publishableKey: string) {
  if (stripePromiseKey !== publishableKey) {
    stripePromiseKey = publishableKey
    stripePromiseCache = loadStripe(publishableKey)
  }
  return stripePromiseCache
}

function mapDepositLabel(stripeStatus: string): string {
  if (stripeStatus === "succeeded" || stripeStatus === "requires_capture") {
    return "Held"
  }
  if (stripeStatus === "canceled") return "Refunded / canceled"
  if (stripeStatus === "requires_payment_method") return "Failed"
  return `Stripe: ${stripeStatus}`
}

function PayForm({
  amountPkr,
  onResult,
}: {
  amountPkr: number
  onResult: (panel: ResultPanel) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url:
          typeof window !== "undefined"
            ? `${window.location.origin}/admin-test/stripe`
            : undefined,
      },
    })

    setSubmitting(false)

    if (error) {
      onResult({
        tone: "error",
        title: "Payment failed",
        lines: [
          `UI status: Failed`,
          `Error: ${error.message ?? "Unknown Stripe error"}`,
          error.code ? `Code: ${error.code}` : "",
        ].filter(Boolean),
      })
      return
    }

    const status = paymentIntent?.status ?? "unknown"
    const held = status === "succeeded" || status === "requires_capture"

    onResult({
      tone: held ? "success" : "error",
      title: held ? "Payment succeeded" : "Payment did not complete",
      lines: [
        `UI deposit status: ${mapDepositLabel(status)}`,
        `Stripe PaymentIntent status: ${status}`,
        paymentIntent?.id ? `PaymentIntent: ${paymentIntent.id}` : "",
        `Amount: Rs. ${amountPkr.toLocaleString("en-PK")}`,
        held
          ? "This matches the real booking flow: collected deposit → Held (platform escrow)."
          : "Unexpected status — check Stripe Dashboard (test mode).",
      ].filter(Boolean),
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Confirming…" : "Confirm test card payment"}
      </button>
      <p className="text-xs text-zinc-500">
        Use test card <span className="font-mono">4242 4242 4242 4242</span>, any
        future expiry, any CVC. Never use a real card.
      </p>
    </form>
  )
}

export default function StripeAdminTestPage() {
  const [harness, setHarness] = useState<HarnessStatus | null>(null)
  const [amount, setAmount] = useState("5000")
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [intent, setIntent] = useState<IntentResponse | null>(null)
  const [result, setResult] = useState<ResultPanel | null>(null)
  const [formError, setFormError] = useState("")

  const loadHarness = useCallback(async () => {
    const res = await fetch("/api/payments/test/deposit", { cache: "no-store" })
    const data = (await res.json()) as HarnessStatus
    setHarness(data)
  }, [])

  useEffect(() => {
    void loadHarness()
  }, [loadHarness])

  const blocked = harness != null && !harness.ok

  async function startDeposit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setResult(null)
    setIntent(null)

    const amountPkr = Math.round(Number(amount))
    if (!Number.isFinite(amountPkr)) {
      setFormError("Enter a valid amount.")
      return
    }

    setLoadingIntent(true)
    try {
      const res = await fetch("/api/payments/test/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPkr }),
      })
      const data = (await res.json()) as IntentResponse & { message?: string }
      if (!res.ok) {
        setFormError(data.message ?? "Could not start test deposit")
        setResult({
          tone: "error",
          title: "Could not create PaymentIntent",
          lines: [data.message ?? "Unknown error", `HTTP ${res.status}`],
        })
        return
      }
      setIntent(data)
      setResult({
        tone: "info",
        title: "PaymentIntent created — enter test card below",
        lines: [
          `Booking ID (fake): ${data.bookingId}`,
          `PaymentIntent: ${data.paymentIntentId}`,
          `Stripe status: ${data.stripeStatus}`,
          `If you pay successfully, UI status will be: ${data.depositStatusIfSucceeded} (Held)`,
        ],
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error")
    } finally {
      setLoadingIntent(false)
    }
  }

  const elementsOptions = useMemo(
    () => (intent ? { clientSecret: intent.clientSecret } : null),
    [intent]
  )

  return (
    <main className="min-h-dvh bg-zinc-100 px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4" role="note">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-950">
            Temporary / test-only — not a product page
          </p>
          <p className="mt-2 text-sm text-amber-900/90">
            Isolated Stripe deposit harness. Bypasses sign-in and booking UI. Uses the
            same <code className="font-mono text-xs">collectDeposit()</code> path as
            real bookings. Delete <code className="font-mono text-xs">/admin-test/stripe</code>{" "}
            after staging E2E works.
          </p>
        </div>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Stripe deposit test</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Firebase project:{" "}
            <span className="font-mono">
              {harness?.firebaseProjectId ?? "loading…"}
            </span>
          </p>
        </header>

        {blocked ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4" role="alert">
            <p className="font-semibold text-rose-950">Payments not yet available</p>
            <p className="mt-2 text-sm text-rose-900/90">
              {harness?.message ??
                "Refused — production safety block or missing test keys."}
            </p>
          </div>
        ) : (
          <form
            onSubmit={startDeposit}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <label className="block text-sm font-medium text-zinc-700">
              Amount (PKR)
              <input
                type="number"
                min={harness?.minAmountPkr ?? 5000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <p className="text-xs text-zinc-500">
              Minimum Rs. {(harness?.minAmountPkr ?? 5000).toLocaleString("en-PK")}{" "}
              (Stripe FX floor for PKR).
            </p>
            {formError ? (
              <p className="text-sm text-rose-700" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loadingIntent || harness == null}
              className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              {loadingIntent ? "Creating PaymentIntent…" : "Test Deposit Payment"}
            </button>
          </form>
        )}

        {intent && elementsOptions && !blocked ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <Elements
              stripe={getStripePromise(intent.publishableKey)}
              options={elementsOptions}
            >
              <PayForm amountPkr={intent.amountPkr} onResult={setResult} />
            </Elements>
          </div>
        ) : null}

        {result ? (
          <div
            className={`rounded-xl border p-4 ${
              result.tone === "success"
                ? "border-emerald-300 bg-emerald-50"
                : result.tone === "error"
                  ? "border-rose-300 bg-rose-50"
                  : "border-sky-300 bg-sky-50"
            }`}
            role="status"
          >
            <p className="font-semibold">{result.title}</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {result.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  )
}

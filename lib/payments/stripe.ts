/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Stripe family-facing collection only. Staging + TEST MODE keys (sk_test_ /
 * pk_test_) until you personally confirm credentials and sign off on live.
 * Never call this module when credentials are missing — use requireStripeConfigured.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Stripe from "stripe"
import {
  fromStripeAmountUnits,
  getStripeCurrency,
  requireStripeConfigured,
  toStripeAmountUnits,
} from "./config"
import type {
  CaptureDepositInput,
  CaptureDepositResult,
  CollectBalanceInput,
  CollectBalanceResult,
  CollectDepositInput,
  CollectDepositResult,
  RefundDepositInput,
  RefundDepositResult,
} from "./types"

const STRIPE_API_VERSION = "2026-06-24.dahlia" as const

let stripeSingleton: { key: string; client: Stripe } | null = null

function getStripe(): Stripe {
  const { secretKey } = requireStripeConfigured()
  if (stripeSingleton?.key === secretKey) {
    return stripeSingleton.client
  }
  const client = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  })
  stripeSingleton = { key: secretKey, client }
  return client
}

function commonMetadata(input: {
  bookingId: string
  weddingId: string
  vendorId: string
  kind: "deposit" | "balance"
}): Stripe.MetadataParam {
  return {
    bookingId: input.bookingId,
    weddingId: input.weddingId,
    vendorId: input.vendorId,
    kind: input.kind,
    app: "shaadi-saathi",
  }
}

/**
 * Collect the family deposit immediately (automatic capture).
 *
 * UI "Held" means funds are collected into Shaadi Saathi's Stripe balance and
 * not yet released to the vendor (Safepay later). We do NOT use Stripe manual
 * capture for long wedding timelines — card authorizations typically expire
 * in ~7 days, which cannot cover event-day escrow.
 */
export async function createDepositPaymentIntent(
  input: CollectDepositInput
): Promise<CollectDepositResult> {
  const stripe = getStripe()
  const currency = getStripeCurrency()
  const amount = toStripeAmountUnits(input.amountPkr, currency)

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      capture_method: "automatic",
      confirm: false,
      automatic_payment_methods: { enabled: true },
      description:
        input.description ??
        `Shaadi Saathi deposit for booking ${input.bookingId}`,
      metadata: {
        ...commonMetadata({
          bookingId: input.bookingId,
          weddingId: input.weddingId,
          vendorId: input.vendorId,
          kind: "deposit",
        }),
        paymentPath: input.paymentPath,
        escrow: "platform_held",
        ...(input.inPersonMethod ? { inPersonMethod: input.inPersonMethod } : {}),
      },
      ...(input.customerEmail ? { receipt_email: input.customerEmail } : {}),
    },
    {
      idempotencyKey: `deposit_${input.bookingId}`,
    }
  )

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client secret for the deposit PaymentIntent")
  }

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    amountPkr: input.amountPkr,
    currency,
    status: intent.status,
  }
}

/**
 * Collect the remaining balance (automatic capture). Typically created when
 * online-path balance is due near the event / at check-in.
 */
export async function createBalancePaymentIntent(
  input: CollectBalanceInput
): Promise<CollectBalanceResult> {
  const stripe = getStripe()
  const currency = getStripeCurrency()
  const amount = toStripeAmountUnits(input.amountPkr, currency)

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      capture_method: "automatic",
      confirm: false,
      automatic_payment_methods: { enabled: true },
      description:
        input.description ??
        `Shaadi Saathi balance for booking ${input.bookingId}`,
      metadata: commonMetadata({
        bookingId: input.bookingId,
        weddingId: input.weddingId,
        vendorId: input.vendorId,
        kind: "balance",
      }),
    },
    {
      idempotencyKey: `balance_${input.bookingId}`,
    }
  )

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client secret for the balance PaymentIntent")
  }

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    amountPkr: input.amountPkr,
    currency,
    status: intent.status,
  }
}

/**
 * Vendor check-in "release" for deposits that were already captured into the
 * platform balance. If a legacy manual-capture PI is still `requires_capture`,
 * capture it; otherwise treat succeeded deposits as already collected.
 */
export async function captureDepositPaymentIntent(
  input: CaptureDepositInput
): Promise<CaptureDepositResult> {
  const stripe = getStripe()
  const existing = await stripe.paymentIntents.retrieve(input.paymentIntentId)

  if (existing.status === "succeeded") {
    return {
      paymentIntentId: existing.id,
      status: existing.status,
      amountCapturedPkr: fromStripeAmountUnits(
        existing.amount_received || existing.amount,
        existing.currency
      ),
    }
  }

  if (existing.status === "requires_capture") {
    const intent = await stripe.paymentIntents.capture(input.paymentIntentId, undefined, {
      idempotencyKey: `capture_deposit_${input.bookingId}`,
    })
    return {
      paymentIntentId: intent.id,
      status: intent.status,
      amountCapturedPkr: fromStripeAmountUnits(intent.amount_received, intent.currency),
    }
  }

  throw new Error(
    `Cannot release deposit PaymentIntent in status "${existing.status}"`
  )
}

/** Refund a collected deposit (no-show path), or cancel a legacy uncaptured auth. */
export async function cancelDepositAuthorization(
  input: RefundDepositInput
): Promise<RefundDepositResult> {
  const stripe = getStripe()
  const existing = await stripe.paymentIntents.retrieve(input.paymentIntentId)

  if (existing.status === "requires_capture") {
    const canceled = await stripe.paymentIntents.cancel(input.paymentIntentId, {
      cancellation_reason: "requested_by_customer",
    })
    return {
      refundId: canceled.id,
      status: canceled.status,
      amountRefundedPkr: fromStripeAmountUnits(canceled.amount, canceled.currency),
    }
  }

  if (existing.status === "succeeded") {
    const refund = await stripe.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          bookingId: input.bookingId,
          reason: input.reason ?? "deposit_refund",
        },
      },
      { idempotencyKey: `refund_deposit_${input.bookingId}` }
    )
    return {
      refundId: refund.id,
      status: refund.status ?? "pending",
      amountRefundedPkr: fromStripeAmountUnits(refund.amount, existing.currency),
    }
  }

  throw new Error(`Cannot refund deposit PaymentIntent in status "${existing.status}"`)
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  return getStripe().paymentIntents.retrieve(paymentIntentId)
}

export function constructStripeWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const { secretKey } = requireStripeConfigured()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set — cannot verify Stripe webhooks")
  }
  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

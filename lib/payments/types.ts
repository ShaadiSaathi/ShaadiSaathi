/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Real money moves through these modules. Build and test only against staging
 * (shaadisaathistaging) with Stripe TEST keys and Safepay SANDBOX. Missing
 * credentials must never silently fall through — callers get a clear
 * "Payments are not yet available" error instead.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
  BalanceStatus,
  DepositStatus,
  InPersonMethod,
  PaymentPath,
} from "@/lib/mockPayments"

export const PAYMENTS_UNAVAILABLE_MESSAGE =
  "Payments are not yet available. Payment providers have not been configured for this environment."

export type PaymentProvider = "stripe" | "safepay"

export type PaymentsAvailability = {
  stripe: boolean
  safepay: boolean
  /** True only when Stripe test/sandbox collection is ready */
  canCollect: boolean
  /** True only when Safepay sandbox payout is ready */
  canPayout: boolean
  mode: "unconfigured" | "test" | "blocked_live"
  message: string | null
  publishableKey: string | null
  currency: string
}

export type CollectDepositInput = {
  bookingId: string
  weddingId: string
  vendorId: string
  amountPkr: number
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
  customerEmail?: string
  description?: string
}

export type CollectDepositResult = {
  paymentIntentId: string
  clientSecret: string
  amountPkr: number
  currency: string
  status: string
}

export type CollectBalanceInput = {
  bookingId: string
  weddingId: string
  vendorId: string
  amountPkr: number
  description?: string
}

export type CollectBalanceResult = {
  paymentIntentId: string
  clientSecret: string
  amountPkr: number
  currency: string
  status: string
}

export type CaptureDepositInput = {
  paymentIntentId: string
  bookingId: string
}

export type CaptureDepositResult = {
  paymentIntentId: string
  status: string
  amountCapturedPkr: number
}

export type RefundDepositInput = {
  paymentIntentId: string
  bookingId: string
  reason?: string
}

export type RefundDepositResult = {
  refundId: string
  status: string
  amountRefundedPkr: number
}

export type PayoutVendorInput = {
  bookingId: string
  amountPkr: number
  /** Pakistani IBAN, e.g. PK25ALFH0216001008658216 */
  creditorIban: string
  /** Idempotency key — reuse on retries */
  requestId: string
}

export type SafepayPayoutStatus =
  | "P_INITIATED"
  | "P_RECEIVED"
  | "P_FAILED"
  | "P_REJECTED"
  | "P_SETTLED"

export type PayoutVendorResult = {
  token: string
  status: SafepayPayoutStatus
  amountPkr: string
  requestId: string
  traceReference?: string
  msgId?: string
  createdAt: string
}

/** Persisted payment snapshot on Firestore bookings */
export type FirestoreBookingPayment = {
  totalPrice: number
  depositAmount: number
  depositPercent: number
  balanceAmount: number
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
  depositStatus: DepositStatus
  balanceStatus: BalanceStatus
  depositPaidAt?: number
  checkInAt?: number
  balanceMarkedPaidAt?: number
  balanceChargedAt?: number
  refundAmount?: number
  refundConfirmedAt?: number
  currency: string
  stripeDepositPaymentIntentId?: string
  stripeBalancePaymentIntentId?: string
  safepayPayoutToken?: string
  safepayPayoutStatus?: SafepayPayoutStatus
  safepayPayoutRequestId?: string
  /** Last payout attempt timestamp (success or failure) */
  safepayPayoutAttemptedAt?: number
  /** Human-readable reason when payout could not complete */
  safepayPayoutError?: string
  updatedAt: number
}

export class PaymentsNotConfiguredError extends Error {
  readonly code = "PAYMENTS_NOT_CONFIGURED" as const

  constructor(message = PAYMENTS_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = "PaymentsNotConfiguredError"
  }
}

export class PaymentsSafetyError extends Error {
  readonly code = "PAYMENTS_SAFETY_BLOCK" as const

  constructor(message: string) {
    super(message)
    this.name = "PaymentsSafetyError"
  }
}

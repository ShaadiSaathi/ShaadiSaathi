/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Unified payment interface for the rest of the app. Callers should not import
 * Stripe or Safepay SDKs directly — use these helpers so credential guards and
 * test/sandbox mode stay consistent.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
  getPaymentsAvailability,
  getStripeCurrency,
  getFirebaseProjectId,
  requireSafepayConfigured,
  requireStripeConfigured,
  PRODUCTION_SIGN_OFF_VALUE,
  PRODUCTION_FIREBASE_PROJECT_ID,
  isFirebaseProductionProject,
  isVercelProduction,
} from "./config"

export {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
} from "./types"

export type {
  CaptureDepositInput,
  CaptureDepositResult,
  CollectBalanceInput,
  CollectBalanceResult,
  CollectDepositInput,
  CollectDepositResult,
  FirestoreBookingPayment,
  PaymentsAvailability,
  PayoutVendorInput,
  PayoutVendorResult,
  RefundDepositInput,
  RefundDepositResult,
  SafepayPayoutStatus,
} from "./types"

import { createBalancePaymentIntent, createDepositPaymentIntent } from "./stripe"
import { cancelDepositAuthorization, captureDepositPaymentIntent } from "./stripe"
import { createVendorPayout } from "./safepay"
import type {
  CaptureDepositInput,
  CaptureDepositResult,
  CollectBalanceInput,
  CollectBalanceResult,
  CollectDepositInput,
  CollectDepositResult,
  PayoutVendorInput,
  PayoutVendorResult,
  RefundDepositInput,
  RefundDepositResult,
} from "./types"

/** Family deposit authorization (Stripe PaymentIntent, manual capture). */
export async function collectDeposit(
  input: CollectDepositInput
): Promise<CollectDepositResult> {
  return createDepositPaymentIntent(input)
}

/** Family balance collection (Stripe PaymentIntent, automatic capture). */
export async function collectBalance(
  input: CollectBalanceInput
): Promise<CollectBalanceResult> {
  return createBalancePaymentIntent(input)
}

/** Capture held deposit after vendor check-in. */
export async function captureHeldDeposit(
  input: CaptureDepositInput
): Promise<CaptureDepositResult> {
  return captureDepositPaymentIntent(input)
}

/** Cancel authorization or refund captured deposit (no-show path). */
export async function refundDeposit(
  input: RefundDepositInput
): Promise<RefundDepositResult> {
  return cancelDepositAuthorization(input)
}

/** Pay vendor from escrow via Safepay Raastwire (sandbox by default). */
export async function payoutVendor(
  input: PayoutVendorInput
): Promise<PayoutVendorResult> {
  return createVendorPayout(input)
}

/**
 * Shared Safepay payout attempt after deposit release.
 * Never throws for "not configured" — records a clear pending/unavailable state.
 */

import {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  payoutVendor,
} from "@/lib/payments"
import { getSafepayCredentials } from "@/lib/payments/config"
import type { FirestoreBookingPayment, SafepayPayoutStatus } from "@/lib/payments/types"
import { getAdminDb } from "@/lib/server/firebase-admin"
import { vendorCanReceivePayments } from "@/lib/firebase/vendor-verification"

export type VendorPayoutAttemptResult = {
  payment: FirestoreBookingPayment
  attempted: boolean
  message: string | null
}

function payoutAmountPkr(payment: FirestoreBookingPayment): number {
  let amountPkr = 0
  if (payment.depositStatus === "released") {
    amountPkr += payment.depositAmount
  }
  if (
    payment.balanceStatus === "charged_pending_release" ||
    payment.balanceStatus === "released_online"
  ) {
    amountPkr += payment.balanceAmount
  }
  if (amountPkr < 1) {
    amountPkr = payment.depositAmount
  }
  return amountPkr
}

/**
 * Attempt Safepay payout using the vendor's stored IBAN.
 * - Missing Safepay credentials → friendly unavailable (no throw)
 * - Unverified vendor → records block reason (caller should usually gate earlier)
 * - Missing IBAN → records actionable error
 * - API success/failure → persists safepayPayoutStatus
 */
export async function attemptVendorPayoutForBooking(input: {
  bookingId: string
  vendorId: string
  payment: FirestoreBookingPayment
}): Promise<VendorPayoutAttemptResult> {
  const now = Date.now()
  const payment = { ...input.payment }

  // Already settled — don't re-initiate
  if (payment.safepayPayoutStatus === "P_SETTLED") {
    return { payment, attempted: false, message: null }
  }

  const safepay = getSafepayCredentials()
  if (!safepay.ok) {
    payment.safepayPayoutAttemptedAt = now
    payment.safepayPayoutError =
      "Payouts not yet available. Safepay credentials have not been configured for this environment."
    payment.updatedAt = now
    return {
      payment,
      attempted: false,
      message: payment.safepayPayoutError,
    }
  }

  const vendorSnap = await getAdminDb().collection("vendors").doc(input.vendorId).get()
  if (!vendorSnap.exists) {
    payment.safepayPayoutAttemptedAt = now
    payment.safepayPayoutError = "Vendor not found for payout"
    payment.updatedAt = now
    return { payment, attempted: false, message: payment.safepayPayoutError }
  }

  if (!vendorCanReceivePayments(vendorSnap.data()?.verificationStatus)) {
    payment.safepayPayoutAttemptedAt = now
    payment.safepayPayoutError =
      "This vendor is not verified yet. Deposits and payouts can only be released to verified vendors."
    payment.updatedAt = now
    return { payment, attempted: false, message: payment.safepayPayoutError }
  }

  const accountSnap = await getAdminDb()
    .collection("vendor_payout_accounts")
    .doc(input.vendorId)
    .get()
  const iban =
    typeof accountSnap.data()?.iban === "string"
      ? (accountSnap.data()!.iban as string).trim()
      : ""

  if (!iban) {
    payment.safepayPayoutAttemptedAt = now
    payment.safepayPayoutError =
      "Vendor has not saved payout bank details (Pakistani IBAN) yet. Ask them to add bank details in Profile."
    payment.updatedAt = now
    return { payment, attempted: false, message: payment.safepayPayoutError }
  }

  const amountPkr = payoutAmountPkr(payment)
  const requestId = payment.safepayPayoutRequestId ?? `payout_${input.bookingId}`

  try {
    const result = await payoutVendor({
      bookingId: input.bookingId,
      amountPkr,
      creditorIban: iban,
      requestId,
    })

    payment.safepayPayoutToken = result.token
    payment.safepayPayoutStatus = result.status as SafepayPayoutStatus
    payment.safepayPayoutRequestId = result.requestId
    payment.safepayPayoutAttemptedAt = now
    payment.safepayPayoutError = undefined
    payment.updatedAt = now

    if (payment.paymentPath === "online") {
      payment.balanceStatus = "released_online"
    }

    return {
      payment,
      attempted: true,
      message: `Payout ${result.status}`,
    }
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) {
      payment.safepayPayoutAttemptedAt = now
      payment.safepayPayoutError = error.message || PAYMENTS_UNAVAILABLE_MESSAGE
      payment.updatedAt = now
      return { payment, attempted: false, message: payment.safepayPayoutError }
    }

    const message =
      error instanceof Error ? error.message : "Safepay payout request failed"
    payment.safepayPayoutAttemptedAt = now
    payment.safepayPayoutStatus = "P_FAILED"
    payment.safepayPayoutRequestId = requestId
    payment.safepayPayoutError = message
    payment.updatedAt = now
    return { payment, attempted: true, message }
  }
}

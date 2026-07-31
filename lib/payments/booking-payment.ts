/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  calculateDepositSplit,
  type InPersonMethod,
  type PaymentPath,
} from "@/lib/mockPayments"
import { getStripeCurrency } from "./config"
import type { FirestoreBookingPayment } from "./types"

export function buildHeldDepositPayment(input: {
  totalPrice: number
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
  stripeDepositPaymentIntentId: string
  now?: number
}): FirestoreBookingPayment {
  const now = input.now ?? Date.now()
  const split = calculateDepositSplit(input.totalPrice)
  return {
    ...split,
    paymentPath: input.paymentPath,
    inPersonMethod:
      input.paymentPath === "in_person" ? input.inPersonMethod : undefined,
    depositStatus: "held",
    balanceStatus:
      input.paymentPath === "in_person" ? "due_in_person" : "pending_online",
    depositPaidAt: now,
    currency: getStripeCurrency(),
    stripeDepositPaymentIntentId: input.stripeDepositPaymentIntentId,
    updatedAt: now,
  }
}

export function paymentFromFirestore(
  payment: FirestoreBookingPayment | undefined,
  fallbackPrice: number,
  paymentPath: PaymentPath
): FirestoreBookingPayment | null {
  if (payment) return payment
  // Legacy bookings without persisted payment lifecycle
  const split = calculateDepositSplit(fallbackPrice)
  return {
    ...split,
    paymentPath,
    depositStatus: "held",
    balanceStatus:
      paymentPath === "in_person" ? "due_in_person" : "pending_online",
    currency: getStripeCurrency(),
    updatedAt: Date.now(),
  }
}

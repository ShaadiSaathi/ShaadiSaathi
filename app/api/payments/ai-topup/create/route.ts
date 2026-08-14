/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Creates a Stripe PaymentIntent for a one-time Wedding AI daily top-up (£2 → +20).
 */

import { NextResponse } from "next/server"
import {
  collectAiTopUp,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  requireStripeConfigured,
} from "@/lib/payments"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import {
  WEDDING_AI_TOPUP_AMOUNT_MAJOR,
  WEDDING_AI_TOPUP_CURRENCY,
  WEDDING_AI_TOPUP_QUESTIONS,
  weddingAiUtcDateKey,
} from "@/lib/server/wedding-ai-usage"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { uid, weddingId } = await assertFamilyWeddingPremium(request)
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const { publishableKey } = requireStripeConfigured()
    const dateKey = weddingAiUtcDateKey()
    const intent = await collectAiTopUp({
      weddingId,
      userId: uid,
      dateKey,
      amountMajor: WEDDING_AI_TOPUP_AMOUNT_MAJOR,
      currency: WEDDING_AI_TOPUP_CURRENCY,
      questions: WEDDING_AI_TOPUP_QUESTIONS,
      description: `Wedding AI +${WEDDING_AI_TOPUP_QUESTIONS} questions (${dateKey})`,
    })

    return NextResponse.json({
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      publishableKey,
      currency: intent.currency,
      amountMajor: intent.amountMajor,
      questions: intent.questions,
    })
  } catch (error) {
    if (error instanceof PaymentAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    if (
      error instanceof PaymentsNotConfiguredError ||
      error instanceof PaymentsSafetyError
    ) {
      return NextResponse.json(
        { message: error.message || PAYMENTS_UNAVAILABLE_MESSAGE },
        { status: 503 }
      )
    }
    console.error("[payments/ai-topup/create]", error)
    return NextResponse.json(
      { message: "Could not start Wedding AI top-up payment" },
      { status: 500 }
    )
  }
}

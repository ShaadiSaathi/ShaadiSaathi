/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Confirms a succeeded Wedding AI top-up PaymentIntent and adds questions
 * to today's family allowance (idempotent per PaymentIntent id).
 */

import { NextResponse } from "next/server"
import {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
} from "@/lib/payments"
import { retrievePaymentIntent } from "@/lib/payments/stripe"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import {
  applyWeddingAiTopUp,
  WEDDING_AI_TOPUP_QUESTIONS,
  weddingAiUtcDateKey,
} from "@/lib/server/wedding-ai-usage"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { weddingId } = await assertFamilyWeddingPremium(request)
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const body = (await request.json()) as { paymentIntentId?: string }
    const paymentIntentId = body.paymentIntentId?.trim()
    if (!paymentIntentId) {
      return NextResponse.json(
        { message: "Missing paymentIntentId" },
        { status: 400 }
      )
    }

    const intent = await retrievePaymentIntent(paymentIntentId)
    if (intent.metadata?.kind !== "ai_topup") {
      return NextResponse.json(
        { message: "Payment is not a Wedding AI top-up" },
        { status: 400 }
      )
    }
    if (intent.metadata?.weddingId !== weddingId) {
      return NextResponse.json(
        { message: "Payment does not match this wedding" },
        { status: 403 }
      )
    }
    if (intent.status !== "succeeded") {
      return NextResponse.json(
        {
          message: `Top-up payment is not complete (status: ${intent.status}). Use a Stripe test card (e.g. 4242…).`,
        },
        { status: 400 }
      )
    }

    const questionsRaw = Number(intent.metadata?.questions)
    const questions =
      Number.isFinite(questionsRaw) && questionsRaw > 0
        ? Math.min(Math.floor(questionsRaw), 500)
        : WEDDING_AI_TOPUP_QUESTIONS

    const dateKey =
      typeof intent.metadata?.dateKey === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(intent.metadata.dateKey)
        ? intent.metadata.dateKey
        : weddingAiUtcDateKey()

    const { usage } = await applyWeddingAiTopUp({
      weddingId,
      paymentIntentId,
      questions,
      dateKey,
    })

    return NextResponse.json({ usage })
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
    console.error("[payments/ai-topup/complete]", error)
    return NextResponse.json(
      { message: "Could not confirm Wedding AI top-up" },
      { status: 500 }
    )
  }
}

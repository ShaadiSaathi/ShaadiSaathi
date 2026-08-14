/**
 * GET /api/wedding-chat/usage
 * Premium family members — today's Wedding AI quota for their wedding.
 */

import { NextRequest, NextResponse } from "next/server"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import { getWeddingAiUsage } from "@/lib/server/wedding-ai-usage"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const { weddingId } = await assertFamilyWeddingPremium(req)
    const usage = await getWeddingAiUsage(weddingId)
    return NextResponse.json({ usage })
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[wedding-chat/usage]", err)
    return NextResponse.json(
      { error: "Failed to load Wedding AI usage" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import { listWeddingChatHistory } from "@/lib/server/wedding-chat-history"

export const runtime = "nodejs"

/**
 * GET /api/wedding-chat/history?limit=20&cursor=<createdAt>
 * Premium family members only — history scoped to their weddingId.
 */
export async function GET(req: NextRequest) {
  try {
    const { weddingId } = await assertFamilyWeddingPremium(req)
    const { searchParams } = new URL(req.url)
    const limitRaw = searchParams.get("limit")
    const cursorRaw = searchParams.get("cursor")

    const limit = limitRaw ? Number(limitRaw) : undefined
    const cursor =
      cursorRaw && Number.isFinite(Number(cursorRaw))
        ? Number(cursorRaw)
        : null

    if (limitRaw && (!Number.isFinite(limit) || (limit ?? 0) < 1)) {
      return NextResponse.json({ error: "Invalid limit" }, { status: 400 })
    }

    const { items, nextCursor } = await listWeddingChatHistory({
      weddingId,
      limit,
      cursor,
    })

    return NextResponse.json({ items, nextCursor })
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[wedding-chat/history]", err)
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    )
  }
}

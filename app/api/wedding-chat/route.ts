import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import { saveWeddingChatExchange } from "@/lib/server/wedding-chat-history"
import { weddingPlanningContextFromDoc } from "@/lib/server/wedding-planning-context"
import { getAdminDb } from "@/lib/server/firebase-admin"
import type { FirestoreWedding } from "@/lib/firebase/types"
import {
  releaseWeddingAiUsageSlot,
  reserveWeddingAiUsageSlot,
  WeddingAiLimitError,
  type WeddingAiUsageSnapshot,
} from "@/lib/server/wedding-ai-usage"
import {
  isVectorConfigured,
  retrieveKnowledgeChunks,
  getUpstashRestUrl,
  getUpstashRestToken,
  VECTOR_NOT_CONFIGURED_MESSAGE,
  type RetrievedChunk,
} from "@/lib/knowledge/vector"
import {
  classifyWeddingAiMessage,
  weddingAiScopedReply,
} from "@/lib/wedding-ai-scope"
import { WEDDING_AI_SYSTEM_PROMPT } from "@/lib/server/wedding-ai-system-prompt"

export const runtime = "nodejs"

const SYSTEM_PROMPT = WEDDING_AI_SYSTEM_PROMPT

function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (!chunks.length) {
    return "(No relevant knowledge-base chunks were retrieved for this question.)"
  }
  return chunks
    .map((c, i) => {
      const flag = c.anecdotal ? " [ANECDOTAL]" : ""
      return [
        `--- CHUNK ${i + 1}${flag} (score=${c.score.toFixed(3)}, type=${c.chunkType}, region=${c.region}) ---`,
        c.text,
      ].join("\n")
    })
    .join("\n\n")
}

function collectCitations(chunks: RetrievedChunk[]): {
  url: string
  title: string
}[] {
  const seen = new Set<string>()
  const out: { url: string; title: string }[] = []
  for (const c of chunks) {
    c.sourceUrls.forEach((url, idx) => {
      if (seen.has(url)) return
      seen.add(url)
      out.push({
        url,
        title: c.sourceTitles[idx] || url,
      })
    })
  }
  return out
}

const WEDDING_CHAT_MODEL = "claude-sonnet-4-6"

function isStagingFirebase(): boolean {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "shaadisaathistaging"
}

function configPresence() {
  const url = getUpstashRestUrl()
  return {
    anthropicKeyDefined: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    upstashUrlDefined: Boolean(url),
    upstashTokenDefined: Boolean(getUpstashRestToken()),
    upstashHost: url
      ? url.replace(/^https?:\/\//, "").split("/")[0] ?? null
      : null,
    model: WEDDING_CHAT_MODEL,
  }
}

function limitReachedResponse(usage: WeddingAiUsageSnapshot) {
  return NextResponse.json(
    {
      error: `You've used all ${usage.limit} Wedding AI questions for today.`,
      code: "DAILY_LIMIT",
      usage,
    },
    { status: 429 }
  )
}

export async function POST(req: NextRequest) {
  let reservedWeddingId: string | null = null

  try {
    const { uid, weddingId } = await assertFamilyWeddingPremium(req)

    const presence = configPresence()
    console.info("[wedding-chat] config", presence)

    if (!presence.anthropicKeyDefined) {
      return NextResponse.json(
        { error: "Wedding AI is not configured (missing ANTHROPIC_API_KEY)." },
        { status: 503 }
      )
    }

    if (!isVectorConfigured()) {
      return NextResponse.json(
        {
          error: VECTOR_NOT_CONFIGURED_MESSAGE,
          ...(isStagingFirebase() ? { config: presence } : {}),
        },
        { status: 503 }
      )
    }

    const body = (await req.json()) as {
      message?: string
      messages?: { role: string; content: string }[]
    }

    const userMessage =
      (typeof body.message === "string" && body.message.trim()) ||
      [...(body.messages ?? [])]
        .reverse()
        .find((m) => m.role === "user" && typeof m.content === "string")
        ?.content?.trim() ||
      ""

    if (!userMessage || userMessage.length > 4000) {
      return NextResponse.json(
        { error: "Send a non-empty message (max 4000 characters)." },
        { status: 400 }
      )
    }

    const scopeResult = classifyWeddingAiMessage(userMessage)
    if (scopeResult.scope !== "celebration") {
      const reply = weddingAiScopedReply(scopeResult.scope, {
        offTopicHint: scopeResult.offTopicHint,
        userMessage,
      })

      let historyId: string | null = null
      let historySaved = false
      try {
        historyId = await saveWeddingChatExchange({
          weddingId,
          userId: uid,
          question: userMessage,
          answer: reply,
          citations: [],
        })
        historySaved = true
      } catch (historyErr) {
        console.error("[wedding-chat] scoped history write failed", {
          weddingId,
          userId: uid,
          scope: scopeResult.scope,
          err: historyErr,
        })
      }

      console.info("[wedding-chat] scoped reply", {
        scope: scopeResult.scope,
        offTopicHint: scopeResult.offTopicHint ?? null,
      })

      return NextResponse.json({
        reply,
        citations: [],
        retrieved: [],
        grounded: false,
        scoped: scopeResult.scope,
        historyId,
        historySaved,
        usage: null,
      })
    }

    // Enforce quota before any retrieval or Anthropic call.
    let usage: WeddingAiUsageSnapshot
    try {
      usage = await reserveWeddingAiUsageSlot(weddingId)
      reservedWeddingId = weddingId
    } catch (limitErr) {
      if (limitErr instanceof WeddingAiLimitError) {
        return limitReachedResponse(limitErr.usage)
      }
      throw limitErr
    }

    let chunks: RetrievedChunk[]
    try {
      chunks = await retrieveKnowledgeChunks(userMessage, 6)
    } catch (retrieveErr) {
      console.error("[wedding-chat] retrieve failed", retrieveErr)
      throw retrieveErr
    }

    const weddingSnap = await getAdminDb().collection("weddings").doc(weddingId).get()
    const weddingData = weddingSnap.exists
      ? ({ id: weddingSnap.id, ...weddingSnap.data() } as FirestoreWedding)
      : null
    const profileBlock = weddingData ? weddingPlanningContextFromDoc(weddingData) : null

    const context = buildContextBlock(chunks)
    const citations = collectCitations(chunks)
    console.info("[wedding-chat] retrieved", {
      count: chunks.length,
      topScore: chunks[0]?.score ?? null,
      types: chunks.map((c) => c.chunkType),
      hasProfileContext: Boolean(profileBlock),
    })

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
    })
    const systemParts = [SYSTEM_PROMPT]
    if (profileBlock) {
      systemParts.push(`FAMILY PROFILE:\n${profileBlock}`)
    }
    systemParts.push(`CONTEXT:\n${context}`)
    let response
    try {
      response = await client.messages.create({
        model: WEDDING_CHAT_MODEL,
        max_tokens: 1024,
        system: systemParts.join("\n\n"),
        messages: [{ role: "user", content: userMessage }],
      })
    } catch (llmErr) {
      console.error("[wedding-chat] anthropic failed", llmErr)
      throw llmErr
    }

    // Successful Anthropic response — keep the reserved slot.
    reservedWeddingId = null

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")

    let historyId: string | null = null
    let historySaved = false
    try {
      historyId = await saveWeddingChatExchange({
        weddingId,
        userId: uid,
        question: userMessage,
        answer: reply,
        citations,
      })
      historySaved = true
    } catch (historyErr) {
      console.error("[wedding-chat] history write failed", {
        weddingId,
        userId: uid,
        err: historyErr,
      })
    }

    return NextResponse.json({
      reply,
      citations,
      retrieved: chunks.map((c) => ({
        id: c.id,
        score: c.score,
        chunkType: c.chunkType,
        anecdotal: c.anecdotal,
        region: c.region,
      })),
      grounded: chunks.length > 0,
      scoped: "celebration" as const,
      historyId,
      historySaved,
      usage,
    })
  } catch (err) {
    if (reservedWeddingId) {
      try {
        await releaseWeddingAiUsageSlot(reservedWeddingId)
      } catch (releaseErr) {
        console.error("[wedding-chat] usage release failed", releaseErr)
      }
    }
    if (err instanceof WeddingAiLimitError) {
      return limitReachedResponse(err.usage)
    }
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : String(err)
    const name = err instanceof Error ? err.name : typeof err
    console.error("[wedding-chat]", { name, message, err })
    return NextResponse.json(
      {
        error: isStagingFirebase()
          ? `Failed to get a wedding AI response: ${name}: ${message}`
          : "Failed to get a wedding AI response. Please try again.",
        ...(isStagingFirebase() ? { config: configPresence() } : {}),
      },
      { status: 500 }
    )
  }
}

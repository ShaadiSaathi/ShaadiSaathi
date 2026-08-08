import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import { saveWeddingChatExchange } from "@/lib/server/wedding-chat-history"
import {
  isVectorConfigured,
  retrieveKnowledgeChunks,
  getUpstashRestUrl,
  getUpstashRestToken,
  VECTOR_NOT_CONFIGURED_MESSAGE,
  type RetrievedChunk,
} from "@/lib/knowledge/vector"

export const runtime = "nodejs"

const SYSTEM_PROMPT = `You are Shaadi Saathi's wedding planning assistant for South Asian (and related) wedding & decoration questions.

STRICT RULES:
1. Answer ONLY using the CONTEXT chunks provided below. If CONTEXT is empty or insufficient for the question, say clearly that you don't have enough information in the knowledge base — do not guess or invent.
2. Never invent specific vendor business names, package prices, or fees. You may mention vendor *categories* only if they appear in CONTEXT.
3. When a CONTEXT chunk is marked ANECDOTAL, say so (e.g. "this is anecdotal / informal community signal") and do not present it as settled fact.
4. Prefer concise, practical answers (2–4 short paragraphs or a short bullet list).
5. If the question is off-topic (not wedding planning / decoration / traditions covered in CONTEXT), say you can only help with wedding planning knowledge from the knowledge base.
6. Do not claim the information is original ethnography — it is summarized planning guidance with sources for further reading.`

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

export async function POST(req: NextRequest) {
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

    let chunks: RetrievedChunk[]
    try {
      chunks = await retrieveKnowledgeChunks(userMessage, 6)
    } catch (retrieveErr) {
      console.error("[wedding-chat] retrieve failed", retrieveErr)
      throw retrieveErr
    }

    const context = buildContextBlock(chunks)
    const citations = collectCitations(chunks)
    console.info("[wedding-chat] retrieved", {
      count: chunks.length,
      topScore: chunks[0]?.score ?? null,
      types: chunks.map((c) => c.chunkType),
    })

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
    })
    let response
    try {
      response = await client.messages.create({
        model: WEDDING_CHAT_MODEL,
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`,
        messages: [{ role: "user", content: userMessage }],
      })
    } catch (llmErr) {
      console.error("[wedding-chat] anthropic failed", llmErr)
      throw llmErr
    }

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
      historyId,
      historySaved,
    })
  } catch (err) {
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

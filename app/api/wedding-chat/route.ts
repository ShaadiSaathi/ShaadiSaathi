import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { assertFamilyWeddingPremium } from "@/lib/server/premium-auth"
import {
  isVectorConfigured,
  retrieveKnowledgeChunks,
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

export async function POST(req: NextRequest) {
  try {
    await assertFamilyWeddingPremium(req)

    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "Wedding AI is not configured (missing ANTHROPIC_API_KEY)." },
        { status: 503 }
      )
    }

    if (!isVectorConfigured()) {
      return NextResponse.json(
        { error: VECTOR_NOT_CONFIGURED_MESSAGE },
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

    const chunks = await retrieveKnowledgeChunks(userMessage, 6)
    const context = buildContextBlock(chunks)
    const citations = collectCitations(chunks)

    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`,
      messages: [{ role: "user", content: userMessage }],
    })

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")

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
    })
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[wedding-chat]", err)
    return NextResponse.json(
      { error: "Failed to get a wedding AI response. Please try again." },
      { status: 500 }
    )
  }
}

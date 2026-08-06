/**
 * Upstash Vector client for wedding knowledge RAG.
 * Index must be created with a built-in embedding model (e.g. BGE Small EN
 * or text-embedding-3-small) so we can upsert/query raw `data` strings.
 */

import { Index } from "@upstash/vector"
import type { KnowledgeChunk } from "./chunks"

export const VECTOR_NOT_CONFIGURED_MESSAGE =
  "Wedding AI vector store is not configured"

export type KnowledgeVectorMetadata = {
  tradition: string
  region: string
  community: string
  entryId: string
  chunkType: string
  anecdotal: boolean
  sourceUrls: string[]
  sourceTitles: string[]
  text: string
}

let indexSingleton: Index<KnowledgeVectorMetadata> | null = null

/** Strip accidental wrapping quotes from Vercel/dashboard env pastes. */
function envValue(name: string): string {
  let raw = process.env[name]?.trim() ?? ""
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim()
  }
  return raw
}

export function getUpstashRestUrl(): string {
  return envValue("UPSTASH_VECTOR_REST_URL").replace(/\/+$/, "")
}

export function getUpstashRestToken(): string {
  return envValue("UPSTASH_VECTOR_REST_TOKEN")
}

export function isVectorConfigured(): boolean {
  return Boolean(getUpstashRestUrl() && getUpstashRestToken())
}

export function getKnowledgeVectorIndex(): Index<KnowledgeVectorMetadata> | null {
  if (!isVectorConfigured()) return null
  if (!indexSingleton) {
    indexSingleton = new Index<KnowledgeVectorMetadata>({
      url: getUpstashRestUrl(),
      token: getUpstashRestToken(),
    })
  }
  return indexSingleton
}

export function chunkToUpsertPayload(chunk: KnowledgeChunk) {
  return {
    id: chunk.id,
    data: chunk.text,
    metadata: {
      tradition: chunk.tradition,
      region: chunk.region,
      community: chunk.community,
      entryId: chunk.entryId,
      chunkType: chunk.chunkType,
      anecdotal: chunk.anecdotal,
      sourceUrls: chunk.sourceUrls,
      sourceTitles: chunk.sourceTitles,
      text: chunk.text,
    } satisfies KnowledgeVectorMetadata,
  }
}

export interface RetrievedChunk {
  id: string
  score: number
  text: string
  tradition: string
  region: string
  community: string
  entryId: string
  chunkType: string
  anecdotal: boolean
  sourceUrls: string[]
  sourceTitles: string[]
}

/** Minimum cosine similarity to treat a hit as useful context. */
export const RETRIEVAL_MIN_SCORE = 0.35

export async function retrieveKnowledgeChunks(
  question: string,
  topK = 6
): Promise<RetrievedChunk[]> {
  const index = getKnowledgeVectorIndex()
  if (!index) {
    throw new Error(VECTOR_NOT_CONFIGURED_MESSAGE)
  }

  const results = await index.query({
    data: question,
    topK,
    includeMetadata: true,
    includeData: true,
  })

  return results
    .filter((r) => (r.score ?? 0) >= RETRIEVAL_MIN_SCORE)
    .map((r) => {
      const meta = r.metadata
      const text =
        (typeof r.data === "string" && r.data) ||
        meta?.text ||
        ""
      return {
        id: String(r.id),
        score: r.score ?? 0,
        text,
        tradition: meta?.tradition ?? "",
        region: meta?.region ?? "",
        community: meta?.community ?? "",
        entryId: meta?.entryId ?? "",
        chunkType: meta?.chunkType ?? "",
        anecdotal: Boolean(meta?.anecdotal),
        sourceUrls: Array.isArray(meta?.sourceUrls) ? meta!.sourceUrls : [],
        sourceTitles: Array.isArray(meta?.sourceTitles) ? meta!.sourceTitles : [],
      }
    })
    .filter((c) => c.text.trim().length > 0)
}

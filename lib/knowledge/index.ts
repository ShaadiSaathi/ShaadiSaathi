import type {
  KnowledgeBaseManifest,
  TraditionCategory,
  WeddingKnowledgeEntry,
} from "./types"
import southAsianManifest from "./data/south-asian.json"

const manifests: Partial<Record<TraditionCategory, KnowledgeBaseManifest>> = {
  "south-asian": southAsianManifest as KnowledgeBaseManifest,
}

/** All entries currently loaded (POC: South Asian only). */
export function listKnowledgeEntries(): WeddingKnowledgeEntry[] {
  return Object.values(manifests).flatMap((m) => m?.entries ?? [])
}

export function getKnowledgeByTradition(
  tradition: TraditionCategory
): WeddingKnowledgeEntry[] {
  return manifests[tradition]?.entries ?? []
}

export function getKnowledgeEntry(id: string): WeddingKnowledgeEntry | null {
  return listKnowledgeEntries().find((e) => e.id === id) ?? null
}

/**
 * Naive keyword retrieval for local smoke tests before embeddings exist.
 * Not a substitute for vector RAG — used to validate chunk usefulness.
 */
export function searchKnowledgeNaive(
  query: string,
  limit = 5
): WeddingKnowledgeEntry[] {
  const q = query.toLowerCase()
  const tokens = q.split(/\s+/).filter((t) => t.length > 2)

  const scored = listKnowledgeEntries().map((entry) => {
    const hay = JSON.stringify(entry).toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (hay.includes(t)) score += 1
    }
    if (entry.tradition.replace("-", " ") && q.includes(entry.region.toLowerCase().slice(0, 5))) {
      score += 2
    }
    return { entry, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry)
}

export function getPopulatedCategories(): TraditionCategory[] {
  return (Object.keys(manifests) as TraditionCategory[]).filter(
    (k) => (manifests[k]?.entries.length ?? 0) > 0
  )
}

export { chunkAllEntries, chunkKnowledgeEntry } from "./chunks"
export type { KnowledgeChunk } from "./chunks"
export {
  isVectorConfigured,
  retrieveKnowledgeChunks,
  RETRIEVAL_MIN_SCORE,
} from "./vector"

export type {
  KnowledgeBaseManifest,
  KnowledgeSource,
  TraditionCategory,
  WeddingKnowledgeEntry,
  SourceReliability,
} from "./types"

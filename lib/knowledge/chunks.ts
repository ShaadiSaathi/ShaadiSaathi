/**
 * Chunk wedding knowledge entries for vector upsert / RAG retrieval.
 * One entry → many chunks (ceremony, decor, vendors, etc.) — never one blob.
 */

import type { KnowledgeSource, WeddingKnowledgeEntry } from "./types"

export type KnowledgeChunkType =
  | "notes"
  | "ceremony"
  | "decor"
  | "palette"
  | "floral"
  | "lighting"
  | "seating"
  | "vendors"
  | "trends"

export interface KnowledgeChunk {
  id: string
  text: string
  tradition: string
  region: string
  community: string
  entryId: string
  chunkType: KnowledgeChunkType
  anecdotal: boolean
  sourceUrls: string[]
  sourceTitles: string[]
}

function sourcesMeta(sources: KnowledgeSource[]): {
  sourceUrls: string[]
  sourceTitles: string[]
} {
  return {
    sourceUrls: sources.map((s) => s.url),
    sourceTitles: sources.map((s) => s.title),
  }
}

function base(
  entry: WeddingKnowledgeEntry,
  chunkType: KnowledgeChunkType,
  suffix: string,
  text: string,
  anecdotal = false
): KnowledgeChunk {
  const { sourceUrls, sourceTitles } = sourcesMeta(entry.sourceUrls)
  return {
    id: `${entry.id}::${chunkType}::${suffix}`,
    text: text.trim(),
    tradition: entry.tradition,
    region: entry.region,
    community: entry.community,
    entryId: entry.id,
    chunkType,
    anecdotal,
    sourceUrls,
    sourceTitles,
  }
}

export function chunkKnowledgeEntry(entry: WeddingKnowledgeEntry): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = []

  chunks.push(
    base(
      entry,
      "notes",
      "overview",
      [
        `South Asian wedding knowledge — ${entry.community}`,
        `Region: ${entry.region}`,
        `Tradition category: ${entry.tradition}`,
        entry.notes,
      ].join("\n")
    )
  )

  for (const event of entry.ceremonyEvents) {
    chunks.push(
      base(
        entry,
        "ceremony",
        event.id,
        [
          `Ceremony event: ${event.name}`,
          event.aliases?.length ? `Also known as: ${event.aliases.join(", ")}` : "",
          `Order: ${event.order}`,
          `Timing: ${event.timing}`,
          event.host ? `Host: ${event.host}` : "",
          event.description,
          event.typicalGuestScale ? `Typical guest scale: ${event.typicalGuestScale}` : "",
          event.decorNotes ? `Decor notes: ${event.decorNotes}` : "",
          `Community: ${entry.community}. Region: ${entry.region}.`,
        ]
          .filter(Boolean)
          .join("\n")
      )
    )
  }

  for (const theme of entry.decorThemes) {
    chunks.push(
      base(
        entry,
        "decor",
        theme.id,
        [
          `Decor theme: ${theme.name}`,
          `Motifs: ${theme.motifs.join(", ")}`,
          theme.description,
          theme.bestForEvents?.length
            ? `Best for events: ${theme.bestForEvents.join(", ")}`
            : "",
          `Community: ${entry.community}.`,
        ]
          .filter(Boolean)
          .join("\n")
      )
    )
  }

  for (const palette of entry.colorPalettes) {
    chunks.push(
      base(
        entry,
        "palette",
        palette.id,
        [
          `Colour palette: ${palette.name}`,
          `Colours: ${palette.colors.join(", ")}`,
          palette.typicalEvents?.length
            ? `Typical events: ${palette.typicalEvents.join(", ")}`
            : "",
          palette.notes ?? "",
          `Community: ${entry.community}.`,
        ]
          .filter(Boolean)
          .join("\n")
      )
    )
  }

  if (entry.floralConventions.length) {
    chunks.push(
      base(
        entry,
        "floral",
        "all",
        [
          `Floral conventions for ${entry.community}`,
          ...entry.floralConventions.map((f) => `- ${f}`),
        ].join("\n")
      )
    )
  }

  if (entry.lightingConventions.length) {
    chunks.push(
      base(
        entry,
        "lighting",
        "all",
        [
          `Lighting conventions for ${entry.community}`,
          ...entry.lightingConventions.map((f) => `- ${f}`),
        ].join("\n")
      )
    )
  }

  if (entry.seatingSetups.length) {
    chunks.push(
      base(
        entry,
        "seating",
        "all",
        [
          `Seating setups for ${entry.community}`,
          ...entry.seatingSetups.map((f) => `- ${f}`),
        ].join("\n")
      )
    )
  }

  if (entry.commonVendors.length) {
    chunks.push(
      base(
        entry,
        "vendors",
        "all",
        [
          `Common vendor categories for ${entry.community} (${entry.region})`,
          "Do not invent prices or specific vendor business names.",
          ...entry.commonVendors.map(
            (v) =>
              `- ${v.label}: ${v.whyNeeded}${v.bookingTip ? ` Tip: ${v.bookingTip}` : ""}`
          ),
        ].join("\n")
      )
    )
  }

  for (const trend of entry.trendsByYear) {
    chunks.push(
      base(
        entry,
        "trends",
        `${trend.year}-${trend.anecdotal ? "anec" : "ind"}-${trend.summary.slice(0, 24).replace(/\W+/g, "-")}`,
        [
          `Wedding trend year ${trend.year} — ${entry.community}`,
          trend.anecdotal
            ? "Reliability: ANECDOTAL (community / informal signal — treat as uncertain)."
            : "Reliability: industry publication summary.",
          trend.summary,
          ...trend.examples.map((e) => `- ${e}`),
        ].join("\n"),
        Boolean(trend.anecdotal)
      )
    )
  }

  return chunks.filter((c) => c.text.length > 0)
}

export function chunkAllEntries(entries: WeddingKnowledgeEntry[]): KnowledgeChunk[] {
  return entries.flatMap(chunkKnowledgeEntry)
}

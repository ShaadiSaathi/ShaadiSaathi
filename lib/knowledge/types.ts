/**
 * Wedding & decoration knowledge base — types for the research pipeline
 * and future premium RAG chatbot. Summarized facts only; see sourceUrls.
 */

export type SourceReliability = "authoritative" | "industry" | "anecdotal"

export type TraditionCategory =
  | "western"
  | "south-asian"
  | "east-asian"
  | "southeast-asian"
  | "middle-eastern"
  | "african"

export interface KnowledgeSource {
  url: string
  title: string
  reliability: SourceReliability
  /** ISO date when we summarized this source */
  accessedAt: string
  notes?: string
}

export interface CeremonyEvent {
  id: string
  name: string
  /** Alternate names used in different communities */
  aliases?: string[]
  order: number
  timing: string
  host?: string
  description: string
  typicalGuestScale?: string
  decorNotes?: string
}

export interface DecorTheme {
  id: string
  name: string
  motifs: string[]
  description: string
  bestForEvents?: string[]
}

export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  typicalEvents?: string[]
  notes?: string
}

export interface VendorCategoryHint {
  id: string
  label: string
  whyNeeded: string
  /** Never invent prices in the chatbot — this is guidance only */
  bookingTip?: string
}

export interface YearTrend {
  year: number
  summary: string
  examples: string[]
  /** Forum / community signal must be flagged */
  anecdotal?: boolean
}

/**
 * One knowledge entry = one tradition × region (or faith community) slice.
 * Designed for chunking into embeddings later (one entry ≈ one retrieval unit,
 * with ceremonyEvents / themes as sub-chunks if needed).
 */
export interface WeddingKnowledgeEntry {
  id: string
  tradition: TraditionCategory
  region: string
  community: string
  ceremonyEvents: CeremonyEvent[]
  decorThemes: DecorTheme[]
  colorPalettes: ColorPalette[]
  floralConventions: string[]
  lightingConventions: string[]
  seatingSetups: string[]
  commonVendors: VendorCategoryHint[]
  trendsByYear: YearTrend[]
  notes: string
  sourceUrls: KnowledgeSource[]
}

export interface KnowledgeBaseManifest {
  version: string
  updatedAt: string
  description: string
  categories: TraditionCategory[]
  populated: TraditionCategory[]
  entries: WeddingKnowledgeEntry[]
}

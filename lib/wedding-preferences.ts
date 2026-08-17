/**
 * Structured wedding planning preferences — stored on weddings/{id}.planningPreferences
 * and passed to the Wedding AI assistant as system context.
 */

/** Aligns with south-asian knowledge-base region slices. */
export type WeddingTraditionRegion =
  | "pakistani"
  | "indian"
  | "bangladeshi"
  | "mixed_other"

export type WeddingPlanningEvent = "mehndi" | "baraat" | "nikah" | "walima" | "other"

export type GuestCountRange = "under_50" | "50_150" | "150_300" | "300_plus"

export type WeddingStylePreference =
  | "traditional_classic"
  | "modern_minimal"
  | "fusion"
  | "not_sure"

export type WeddingBudgetTier =
  | "essentials"
  | "mid_range"
  | "no_limit"
  | "still_figuring_out"

export type WeddingPlanningTimeline = "has_date" | "no_date_yet"

export interface WeddingPlanningPreferences {
  traditionRegion?: WeddingTraditionRegion
  plannedEvents?: WeddingPlanningEvent[]
  guestCountRange?: GuestCountRange
  stylePreference?: WeddingStylePreference
  budgetTier?: WeddingBudgetTier
  timeline?: WeddingPlanningTimeline
  /** ISO date (YYYY-MM-DD) when timeline is has_date */
  targetWeddingDate?: string
  updatedAt?: number
}

export const WEDDING_TRADITION_REGION_OPTIONS: {
  value: WeddingTraditionRegion
  label: string
  knowledgeRegion: string
}[] = [
  {
    value: "pakistani",
    label: "Pakistani",
    knowledgeRegion: "Pakistan (and Pakistani diaspora)",
  },
  {
    value: "indian",
    label: "Indian",
    knowledgeRegion: "North India (and North Indian diaspora)",
  },
  {
    value: "bangladeshi",
    label: "Bangladeshi",
    knowledgeRegion: "Bangladesh (and Bangladeshi diaspora)",
  },
  {
    value: "mixed_other",
    label: "Mixed / other",
    knowledgeRegion: "Mixed South Asian / other",
  },
]

export const WEDDING_PLANNING_EVENT_OPTIONS: {
  value: WeddingPlanningEvent
  label: string
}[] = [
  { value: "mehndi", label: "Mehndi" },
  { value: "baraat", label: "Baraat" },
  { value: "nikah", label: "Nikah" },
  { value: "walima", label: "Walima" },
  { value: "other", label: "Other" },
]

export const GUEST_COUNT_RANGE_OPTIONS: {
  value: GuestCountRange
  label: string
}[] = [
  { value: "under_50", label: "Under 50" },
  { value: "50_150", label: "50–150" },
  { value: "150_300", label: "150–300" },
  { value: "300_plus", label: "300+" },
]

export const WEDDING_STYLE_OPTIONS: {
  value: WeddingStylePreference
  label: string
}[] = [
  { value: "traditional_classic", label: "Traditional / classic" },
  { value: "modern_minimal", label: "Modern / minimal" },
  { value: "fusion", label: "Fusion" },
  { value: "not_sure", label: "Not sure yet" },
]

export const WEDDING_BUDGET_TIER_OPTIONS: {
  value: WeddingBudgetTier
  label: string
}[] = [
  { value: "essentials", label: "Essentials — keep costs lean" },
  { value: "mid_range", label: "Mid-range — balanced spend" },
  { value: "no_limit", label: "No strict limit" },
  { value: "still_figuring_out", label: "Still figuring it out" },
]

const TRADITION_SET = new Set(WEDDING_TRADITION_REGION_OPTIONS.map((o) => o.value))
const EVENT_SET = new Set(WEDDING_PLANNING_EVENT_OPTIONS.map((o) => o.value))
const GUEST_SET = new Set(GUEST_COUNT_RANGE_OPTIONS.map((o) => o.value))
const STYLE_SET = new Set(WEDDING_STYLE_OPTIONS.map((o) => o.value))
const BUDGET_SET = new Set(WEDDING_BUDGET_TIER_OPTIONS.map((o) => o.value))
const TIMELINE_SET = new Set<WeddingPlanningTimeline>(["has_date", "no_date_yet"])

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Strip unknown values; returns null when nothing meaningful remains. */
export function normalizeWeddingPlanningPreferences(
  input: WeddingPlanningPreferences | null | undefined
): WeddingPlanningPreferences | null {
  if (!input || typeof input !== "object") return null

  const out: WeddingPlanningPreferences = {}

  if (
    input.traditionRegion &&
    TRADITION_SET.has(input.traditionRegion)
  ) {
    out.traditionRegion = input.traditionRegion
  }

  if (Array.isArray(input.plannedEvents)) {
    const events = input.plannedEvents.filter((e) => EVENT_SET.has(e))
    if (events.length > 0) out.plannedEvents = [...new Set(events)]
  }

  if (input.guestCountRange && GUEST_SET.has(input.guestCountRange)) {
    out.guestCountRange = input.guestCountRange
  }

  if (input.stylePreference && STYLE_SET.has(input.stylePreference)) {
    out.stylePreference = input.stylePreference
  }

  if (input.budgetTier && BUDGET_SET.has(input.budgetTier)) {
    out.budgetTier = input.budgetTier
  }

  if (input.timeline && TIMELINE_SET.has(input.timeline)) {
    out.timeline = input.timeline
  }

  if (
    typeof input.targetWeddingDate === "string" &&
    isIsoDate(input.targetWeddingDate.trim())
  ) {
    out.targetWeddingDate = input.targetWeddingDate.trim()
  }

  if (out.timeline === "no_date_yet") {
    delete out.targetWeddingDate
  }

  if (Object.keys(out).length === 0) return null
  out.updatedAt =
    typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt)
      ? input.updatedAt
      : Date.now()

  return out
}

export function traditionRegionLabel(
  value: WeddingTraditionRegion | undefined
): string | null {
  return WEDDING_TRADITION_REGION_OPTIONS.find((o) => o.value === value)?.label ?? null
}

export function guestCountRangeLabel(
  value: GuestCountRange | undefined
): string | null {
  return GUEST_COUNT_RANGE_OPTIONS.find((o) => o.value === value)?.label ?? null
}

export function stylePreferenceLabel(
  value: WeddingStylePreference | undefined
): string | null {
  return WEDDING_STYLE_OPTIONS.find((o) => o.value === value)?.label ?? null
}

export function budgetTierLabel(value: WeddingBudgetTier | undefined): string | null {
  return WEDDING_BUDGET_TIER_OPTIONS.find((o) => o.value === value)?.label ?? null
}

export function plannedEventsLabel(
  events: WeddingPlanningEvent[] | undefined
): string | null {
  if (!events?.length) return null
  const labels = events
    .map((e) => WEDDING_PLANNING_EVENT_OPTIONS.find((o) => o.value === e)?.label)
    .filter(Boolean)
  return labels.length ? labels.join(", ") : null
}

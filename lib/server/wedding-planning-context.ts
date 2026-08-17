import type { FirestoreWedding } from "@/lib/firebase/types"
import {
  budgetTierLabel,
  guestCountRangeLabel,
  normalizeWeddingPlanningPreferences,
  plannedEventsLabel,
  stylePreferenceLabel,
  traditionRegionLabel,
  type WeddingPlanningPreferences,
} from "@/lib/wedding-preferences"

function formatTimeline(
  prefs: WeddingPlanningPreferences,
  fallbackFirstEventDate?: string
): string | null {
  if (prefs.timeline === "no_date_yet") {
    return "Just started planning — no fixed wedding date yet"
  }
  const date = prefs.targetWeddingDate ?? fallbackFirstEventDate
  if (date) {
    try {
      const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${date}T12:00:00`))
      return `Target wedding date: ${formatted}`
    } catch {
      return `Target wedding date: ${date}`
    }
  }
  return null
}

/**
 * Human-readable profile block for the Wedding AI system prompt.
 * Returns null when no preference fields are set — caller should omit the block.
 */
export function buildWeddingPlanningContextBlock(input: {
  weddingName?: string
  firstEventDate?: string
  planningPreferences?: WeddingPlanningPreferences | null
}): string | null {
  const prefs = normalizeWeddingPlanningPreferences(input.planningPreferences)
  if (!prefs) return null

  const lines: string[] = [
    "This family's stored wedding planning preferences (use to personalize tone and examples; do not invent details beyond this and CONTEXT):",
  ]

  if (input.weddingName?.trim()) {
    lines.push(`- Wedding: ${input.weddingName.trim()}`)
  }

  const tradition = traditionRegionLabel(prefs.traditionRegion)
  if (tradition) lines.push(`- Tradition / region: ${tradition}`)

  const events = plannedEventsLabel(prefs.plannedEvents)
  if (events) lines.push(`- Events being planned: ${events}`)

  const guests = guestCountRangeLabel(prefs.guestCountRange)
  if (guests) lines.push(`- Guest count (approx.): ${guests}`)

  const style = stylePreferenceLabel(prefs.stylePreference)
  if (style) lines.push(`- Style preference: ${style}`)

  const budget = budgetTierLabel(prefs.budgetTier)
  if (budget) lines.push(`- Budget tier: ${budget}`)

  const timeline = formatTimeline(prefs, input.firstEventDate)
  if (timeline) lines.push(`- Timeline: ${timeline}`)

  if (lines.length <= 1) return null
  return lines.join("\n")
}

export function weddingPlanningContextFromDoc(
  wedding: Pick<FirestoreWedding, "name" | "firstEventDate" | "planningPreferences">
): string | null {
  return buildWeddingPlanningContextBlock({
    weddingName: wedding.name,
    firstEventDate: wedding.firstEventDate,
    planningPreferences: wedding.planningPreferences,
  })
}

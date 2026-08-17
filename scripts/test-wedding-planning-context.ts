import { buildWeddingPlanningContextBlock } from "@/lib/server/wedding-planning-context"
import type { WeddingPlanningPreferences } from "@/lib/wedding-preferences"

const SAMPLE_PREFS: WeddingPlanningPreferences = {
  traditionRegion: "pakistani",
  plannedEvents: ["mehndi", "walima"],
  guestCountRange: "150_300",
  stylePreference: "fusion",
  budgetTier: "mid_range",
  timeline: "has_date",
  targetWeddingDate: "2026-11-15",
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const block = buildWeddingPlanningContextBlock({
  weddingName: "Ayesha & Bilal",
  firstEventDate: "2026-11-15",
  planningPreferences: SAMPLE_PREFS,
})

assert(block !== null, "expected profile block for filled preferences")
if (!block) throw new Error("unreachable")
assert(block.includes("Pakistani"), "tradition label missing")
assert(block.includes("Mehndi"), "events missing")
assert(block.includes("150–300"), "guest count missing")
assert(block.includes("Fusion"), "style missing")
assert(block.includes("Mid-range"), "budget missing")

const empty = buildWeddingPlanningContextBlock({
  weddingName: "Test",
  planningPreferences: {},
})
assert(empty === null, "empty preferences should yield null block")

console.log("PASS wedding planning context builder")

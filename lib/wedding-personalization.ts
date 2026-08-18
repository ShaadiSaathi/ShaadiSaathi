/**
 * Copy and ordering helpers from signup planning preferences.
 * UI-only — does not change stored data, bookings, or payments.
 */

import type { EventId } from "@/lib/mockData"
import type { VendorCategory, VendorCategoryId } from "@/lib/mockVendors"
import {
  WEDDING_PLANNING_EVENT_OPTIONS,
  guestCountRangeLabel,
  traditionRegionLabel,
  type GuestCountRange,
  type WeddingPlanningEvent,
  type WeddingPlanningPreferences,
  type WeddingStylePreference,
  type WeddingTraditionRegion,
} from "@/lib/wedding-preferences"

function joinList(items: string[]): string {
  if (items.length === 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

const EVENT_LABELS = Object.fromEntries(
  WEDDING_PLANNING_EVENT_OPTIONS.map((o) => [o.value, o.label])
) as Record<WeddingPlanningEvent, string>

export function plannedEventsPhrase(
  events: WeddingPlanningEvent[] | undefined
): string | null {
  if (!events?.length) return null
  const labels = events
    .filter((e) => e !== "other")
    .map((e) => EVENT_LABELS[e])
    .filter(Boolean)
  return labels.length ? joinList(labels) : null
}

export function coreEventIdsFromPreferences(
  events: WeddingPlanningEvent[] | undefined
): EventId[] {
  const core: EventId[] = []
  for (const event of events ?? []) {
    if (event === "mehndi" || event === "baraat" || event === "walima") {
      if (!core.includes(event)) core.push(event)
    }
  }
  return core
}

export function dashboardGreeting(
  name: string | undefined,
  prefs: WeddingPlanningPreferences | null
): { kicker: string; title: string } {
  const firstName = name?.trim().split(/\s+/)[0]
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  if (events) {
    return {
      kicker: firstName ? `Good morning, ${firstName}` : "Your shaadi",
      title: `Planning your ${events}`,
    }
  }
  return {
    kicker: "Good morning",
    title: `Welcome back, ${name?.trim() || "there"}`,
  }
}

export function guestCountHint(range: GuestCountRange | undefined): string | null {
  switch (range) {
    case "under_50":
      return "Intimate guest list — start with the people who matter most."
    case "50_150":
      return "A mid-size gathering — households first keeps RSVPs tidy."
    case "150_300":
      return "Planning for 150–300? Add family groups so headcount stays honest."
    case "300_plus":
      return "A large celebration — group invites help the list stay manageable."
    default:
      return null
  }
}

function styleHint(style: WeddingStylePreference | undefined): string | null {
  switch (style) {
    case "traditional_classic":
      return "traditional"
    case "modern_minimal":
      return "modern"
    case "fusion":
      return "fusion"
    default:
      return null
  }
}

export function emptyGuestsCopy(prefs: WeddingPlanningPreferences | null): {
  title: string
  description: string
} {
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  const count = guestCountHint(prefs?.guestCountRange)
  if (count) {
    return {
      title: "No guests yet",
      description: count,
    }
  }
  return {
    title: "No guests yet",
    description: events
      ? `Invite your first guest and keep every ${events} RSVP in one place.`
      : "Invite your first guest and keep every mehndi, baraat, and walima RSVP in one place.",
  }
}

export function emptyTasksCopy(prefs: WeddingPlanningPreferences | null): {
  title: string
  description: string
} {
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  const style = styleHint(prefs?.stylePreference)
  if (events && style) {
    return {
      title: "No tasks yet",
      description: `A ${style} ${events} list usually starts with a few bookings and deadlines — add what still needs an owner.`,
    }
  }
  if (events) {
    return {
      title: "No tasks yet",
      description: `Add the first item for your ${events} — artist, catering, transport, whatever is still open.`,
    }
  }
  return {
    title: "No tasks yet",
    description:
      "Add your first task to get the family organized — book the dholki, confirm the caterer, you name it.",
  }
}

export function emptyVendorsCopy(
  prefs: WeddingPlanningPreferences | null,
  directoryEmpty: boolean
): { title: string; description: string } {
  if (directoryEmpty) {
    return {
      title: "No vendors listed yet",
      description:
        "When vendors sign up on Shaadi Saathi, they will appear here for families to discover.",
    }
  }
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  const style = styleHint(prefs?.stylePreference)
  if (events && style) {
    return {
      title: "No vendors match",
      description: `Try another filter — ${style} ${events} vendors are often listed under catering, photo, and decor.`,
    }
  }
  return {
    title: "No vendors match",
    description:
      "Try adjusting your filters or search — our directory has caterers, photographers, mehndi artists, and more.",
  }
}

export function emptyChatCopy(prefs: WeddingPlanningPreferences | null): {
  title: string
  description: string
  starter: string
} {
  const tradition = traditionRegionLabel(prefs?.traditionRegion)
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  const starter = weddingAiStarterQuestion(prefs)
  if (tradition && events) {
    return {
      title: "Ask anything about your shaadi",
      description: `Grounded answers for a ${tradition.toLowerCase()} ${events} — colours, ceremony flow, and décor.`,
      starter,
    }
  }
  return {
    title: "No chat history yet",
    description:
      "Ask about Mehndi colours, Barat décor, or Walima palettes — we’ll keep the answer grounded in our knowledge base.",
    starter,
  }
}

export function vendorsIntro(prefs: WeddingPlanningPreferences | null): string {
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  const style = styleHint(prefs?.stylePreference)
  if (events && style) {
    return `Curated for your ${style} ${events} — catering, decor, mehndi, and more.`
  }
  if (events) {
    return `A curated directory for your ${events} — catering, decor, mehndi, and more.`
  }
  return "A curated directory for your shaadi — catering, decor, mehndi, and more."
}

export function scheduleFooter(prefs: WeddingPlanningPreferences | null): string {
  const events = plannedEventsPhrase(prefs?.plannedEvents)
  if (events) {
    return `Everyone in your family sees this same ${events} timeline — no more “what time is it?” texts.`
  }
  return "Everyone in your family sees this same schedule — no more “what time is baraat?” texts."
}

export function dashboardGuestSubtext(
  prefs: WeddingPlanningPreferences | null
): string {
  const label = guestCountRangeLabel(prefs?.guestCountRange)
  return label ? `Aiming for ${label}` : "Across all events"
}

export function suggestedTaskTitles(
  prefs: WeddingPlanningPreferences | null
): string[] {
  const events = prefs?.plannedEvents ?? []
  const suggestions: string[] = []
  if (events.includes("mehndi")) {
    suggestions.push("Book mehndi artist")
    suggestions.push("Confirm dholki timing")
  }
  if (events.includes("baraat")) {
    suggestions.push("Arrange baraat transport")
  }
  if (events.includes("nikah")) {
    suggestions.push("Confirm nikah officiant")
  }
  if (events.includes("walima")) {
    suggestions.push("Lock walima catering")
  }
  if (suggestions.length === 0) {
    return ["Confirm florist", "Book photographer"]
  }
  return [...new Set(suggestions)].slice(0, 3)
}

export function taskPlaceholder(prefs: WeddingPlanningPreferences | null): string {
  return suggestedTaskTitles(prefs)[0] ?? "Confirm florist"
}

const EVENT_CATEGORY_HINTS: Record<WeddingPlanningEvent, VendorCategoryId[]> = {
  mehndi: ["mehndi-artists", "mehndi-entertainment", "dholki-sangeet", "catering"],
  baraat: ["transport", "photography", "sound-lighting", "catering"],
  nikah: ["photography", "decor", "catering"],
  walima: ["catering", "decor", "photography", "tent-marquee"],
  other: [],
}

export function orderVendorCategories(
  categories: VendorCategory[],
  prefs: WeddingPlanningPreferences | null
): VendorCategory[] {
  if (!prefs) return categories
  const boosted: VendorCategoryId[] = []
  for (const event of prefs.plannedEvents ?? []) {
    for (const id of EVENT_CATEGORY_HINTS[event] ?? []) {
      if (!boosted.includes(id)) boosted.push(id)
    }
  }
  if (prefs.stylePreference === "traditional_classic") {
    for (const id of ["mehndi-artists", "dholki-sangeet"] as VendorCategoryId[]) {
      if (!boosted.includes(id)) boosted.unshift(id)
    }
  }
  if (prefs.stylePreference === "modern_minimal") {
    for (const id of ["photography", "decor"] as VendorCategoryId[]) {
      if (!boosted.includes(id)) boosted.unshift(id)
    }
  }
  if (boosted.length === 0) return categories

  const rank = new Map(boosted.map((id, i) => [id, i]))
  return [...categories].sort((a, b) => {
    const ar = rank.has(a.id) ? rank.get(a.id)! : boosted.length
    const br = rank.has(b.id) ? rank.get(b.id)! : boosted.length
    if (ar !== br) return ar - br
    return 0
  })
}

export function weddingAiStarterQuestion(
  prefs: WeddingPlanningPreferences | null
): string {
  const region = prefs?.traditionRegion
  const events = prefs?.plannedEvents ?? []
  const firstEvent = events.find((e) => e !== "other") ?? "mehndi"
  const eventLabel = EVENT_LABELS[firstEvent] ?? "Mehndi"
  const style = prefs?.stylePreference

  if (style === "fusion") {
    return `How do fusion South Asian weddings usually blend ${eventLabel.toLowerCase()} traditions?`
  }
  if (style === "modern_minimal") {
    return `What does a modern, minimal ${eventLabel.toLowerCase()} typically look like?`
  }

  const regionLead: Record<WeddingTraditionRegion, string> = {
    pakistani: "Pakistani",
    indian: "Indian",
    bangladeshi: "Bangladeshi",
    mixed_other: "South Asian",
  }

  if (region) {
    return `What colours and decor work well for a ${regionLead[region]} ${eventLabel.toLowerCase()}?`
  }

  return "What colours and decor work well for a Pakistani mehndi?"
}

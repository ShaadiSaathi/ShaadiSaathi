/**
 * Wedding AI topic scope — celebrations & planning only.
 * Pure helpers (no server imports) for routing and canned replies.
 */

export type WeddingAiMessageScope = "celebration" | "basic" | "off_topic"

export type WeddingAiScopeResult = {
  scope: WeddingAiMessageScope
  /** Short hint for off-topic replies, e.g. "workouts" */
  offTopicHint?: string
}

const CELEBRATION_TERMS = [
  "wedding",
  "weddings",
  "shaadi",
  "shadi",
  "celebration",
  "celebrations",
  "mehndi",
  "henna",
  "baraat",
  "barat",
  "walima",
  "valima",
  "nikah",
  "nikaah",
  "ruksati",
  "rukhsati",
  "haldi",
  "sangeet",
  "dholki",
  "mayun",
  "mandap",
  "imam",
  "qazi",
  "molvi",
  "bride",
  "groom",
  "dulhan",
  "dulha",
  "guest",
  "guests",
  "rsvp",
  "invite",
  "invitation",
  "seating",
  "vendor",
  "vendors",
  "cater",
  "catering",
  "menu",
  "decor",
  "decoration",
  "decorations",
  "floral",
  "flowers",
  "venue",
  "photographer",
  "photography",
  "videographer",
  "dhol",
  "entry",
  "tradition",
  "traditions",
  "ceremony",
  "ceremonies",
  "ritual",
  "rituals",
  "outfit",
  "outfits",
  "lehenga",
  "sherwani",
  "sari",
  "saree",
  "jewellery",
  "jewelry",
  "bangles",
  "dupatta",
  "favour",
  "favor",
  "favours",
  "favors",
  "timeline",
  "schedule",
  "event",
  "events",
  "family",
  "in-laws",
  "in laws",
  "mahr",
  "mehr",
  "dowry",
  "dholki",
  "reception",
  "engagement",
  "milad",
  "dua",
  "quran",
  "nikkah",
  "colour",
  "color",
  "colours",
  "colors",
  "palette",
  "theme",
  "budget",
  "planning",
  "planner",
  "walima",
  "baraat",
  "mehendi",
] as const

/** Domains we never answer — only when no celebration terms appear in the message. */
const OFF_TOPIC_PATTERNS: { pattern: RegExp; hint: string }[] = [
  { pattern: /\b(workout|gym|fitness|exercise routine|leg day|push.?up|deadlift|squat)\b/i, hint: "workouts" },
  { pattern: /\b(weight loss|lose weight|calorie|keto diet|intermittent fasting)\b/i, hint: "fitness or diet advice" },
  { pattern: /\b(write code|python|javascript|typescript|react|debug|programming|sql query)\b/i, hint: "coding" },
  { pattern: /\b(homework|solve this equation|math problem|algebra|calculus)\b/i, hint: "schoolwork" },
  { pattern: /\b(politics|election|president|prime minister|vote for)\b/i, hint: "politics" },
  { pattern: /\b(bitcoin|crypto|stock market|invest in|trading tips)\b/i, hint: "investing" },
  { pattern: /\b(medical diagnosis|symptoms|prescription|antibiotic|disease treatment)\b/i, hint: "medical advice" },
  { pattern: /\b(movie recommendation|netflix series|video game|fortnite|minecraft)\b/i, hint: "entertainment" },
  { pattern: /\b(travel itinerary|flight deal|hotel in paris|vacation spot)\b/i, hint: "general travel" },
  { pattern: /\b(recipe for(?!.*(walima|mehndi|wedding|reception|serving|guest)))/i, hint: "general recipes" },
]

const BASIC_GREETING =
  /^(hi|hello|hey|hiya|salam|salaam|assalam|assalamu|good morning|good afternoon|good evening|good night)\b/i

const BASIC_THANKS =
  /^(thanks|thank you|thx|ty|shukriya|jazak|much appreciated|appreciate it)\b/i

const BASIC_BYE = /^(bye|goodbye|see you|take care|good night)\b/i

const BASIC_META =
  /^(what can you (help|do)|what do you do|who are you|help me|how does this work|what is this)\b/i

const BASIC_ACK = /^(ok|okay|got it|understood|cool|great|perfect|nice)[!.?\s]*$/i

function normalizeForScope(message: string): string {
  return message.trim().replace(/\s+/g, " ")
}

function containsCelebrationTerm(text: string): boolean {
  const lower = text.toLowerCase()
  return CELEBRATION_TERMS.some((term) => {
    if (term.includes(" ")) return lower.includes(term)
    return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)
  })
}

function matchOffTopic(text: string): string | null {
  for (const { pattern, hint } of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) return hint
  }
  return null
}

function isBasicInteraction(text: string): boolean {
  const t = text.trim()
  if (t.length > 120) return false
  return (
    BASIC_GREETING.test(t) ||
    BASIC_THANKS.test(t) ||
    BASIC_BYE.test(t) ||
    BASIC_META.test(t) ||
    BASIC_ACK.test(t)
  )
}

/**
 * Classify a user message before calling the LLM.
 * Celebration questions proceed to retrieval + Anthropic; basic/off-topic get canned replies.
 */
export function classifyWeddingAiMessage(message: string): WeddingAiScopeResult {
  const text = normalizeForScope(message)
  if (!text) return { scope: "basic" }

  const hasCelebration = containsCelebrationTerm(text)

  if (hasCelebration) {
    return { scope: "celebration" }
  }

  const offTopicHint = matchOffTopic(text)
  if (offTopicHint) {
    return { scope: "off_topic", offTopicHint }
  }

  if (isBasicInteraction(text)) {
    return { scope: "basic" }
  }

  // Short ambiguous chit-chat without celebration terms
  if (text.length <= 40 && !text.includes("?")) {
    if (BASIC_GREETING.test(text) || BASIC_THANKS.test(text) || BASIC_ACK.test(text)) {
      return { scope: "basic" }
    }
  }

  // Default: let the LLM answer if it might be wedding-related phrasing without keywords
  return { scope: "celebration" }
}

export function weddingAiScopedReply(
  scope: WeddingAiMessageScope,
  input?: { offTopicHint?: string; userMessage?: string }
): string {
  const msg = (input?.userMessage ?? "").trim().toLowerCase()

  if (scope === "off_topic") {
    const hint = input?.offTopicHint
    if (hint) {
      return `I'm here for wedding and celebration planning — Mehndi, Baraat, Walima, décor, guests, traditions, and timelines. I can't help with ${hint}, but ask me anything about your shaadi!`
    }
    return "I'm here for wedding and celebration planning — Mehndi, Baraat, Walima, décor, guests, traditions, and timelines. Ask me anything about your celebrations!"
  }

  if (BASIC_THANKS.test(msg)) {
    return "You're welcome! Happy to help with anything else for your wedding celebrations."
  }
  if (BASIC_BYE.test(msg)) {
    return "Khuda hafiz — come back anytime you need help with your wedding planning."
  }
  if (BASIC_META.test(msg)) {
    return "I'm Shaadi Saathi's wedding planning assistant. I answer questions about South Asian celebrations — events, décor, traditions, guest etiquette, vendor types, and timelines — using our curated knowledge base. What would you like to know about your shaadi?"
  }
  if (BASIC_ACK.test(msg)) {
    return "Great — ask whenever you're ready about décor, ceremonies, guests, or anything else for your celebrations."
  }

  return "Salam! I'm Shaadi Saathi's wedding planning assistant. Ask me about your celebrations — Mehndi, Baraat, Walima, décor, guests, traditions, and more."
}

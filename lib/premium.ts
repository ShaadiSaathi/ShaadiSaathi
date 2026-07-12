/**
 * Shaadi Saathi — Premium tier constants, limits, and plan copy.
 * TODO: real payment integration (Safepay, JazzCash, Easypaisa, Stripe) plugs into
 * PremiumContext purchase/subscribe handlers.
 */

import type { VendorCategoryId } from "./mockVendors"

export const FAMILY_PREMIUM_PRICE_PKR = 3499
export const VENDOR_FEATURED_PRICE_PKR = 1999

export const FREE_LIMITS = {
  maxEvents: 3,
  maxGuests: 50,
  maxCollaborators: 2,
} as const

export const PREMIUM_LIMITS = {
  maxEvents: Infinity,
  maxGuests: Infinity,
  maxCollaborators: 8,
} as const

export type InviteThemeId = "classic" | "royal-maroon" | "ivory-gold" | "blush-floral"

export interface InviteTheme {
  id: InviteThemeId
  name: string
  description: string
  /** CSS variables / classes for GuestInvitePage */
  bg: string
  accent: string
  heading: string
  cardBorder: string
  buttonPrimary: string
  motif: string
}

export const INVITE_THEMES: InviteTheme[] = [
  {
    id: "classic",
    name: "Classic (Free)",
    description: "Default maroon & gold — warm and timeless.",
    bg: "bg-ivory",
    accent: "text-gold-dark",
    heading: "text-maroon-dark",
    cardBorder: "border-gold/25",
    buttonPrimary: "bg-maroon text-ivory hover:bg-maroon-dark",
    motif: "from-gold/10 to-transparent",
  },
  {
    id: "royal-maroon",
    name: "Royal Maroon",
    description: "Deep plum tones with rich gold accents.",
    bg: "bg-[#f8f0f4]",
    accent: "text-[#8B6508]",
    heading: "text-[#4A1235]",
    cardBorder: "border-[#6A1B4D]/30",
    buttonPrimary: "bg-[#4A1235] text-ivory hover:bg-[#3d1530]",
    motif: "from-[#6A1B4D]/15 to-gold/10",
  },
  {
    id: "ivory-gold",
    name: "Ivory & Gold",
    description: "Luminous cream with gilded details.",
    bg: "bg-[#FFFDF8]",
    accent: "text-[#9A7209]",
    heading: "text-[#5C4A32]",
    cardBorder: "border-[#D4AF37]/40",
    buttonPrimary: "bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-[#4A1235] hover:opacity-90",
    motif: "from-[#D4AF37]/20 to-ivory",
  },
  {
    id: "blush-floral",
    name: "Blush Floral",
    description: "Soft rose and sage — perfect for mehndi vibes.",
    bg: "bg-[#FFF5F7]",
    accent: "text-rose-700",
    heading: "text-rose-900",
    cardBorder: "border-rose-200",
    buttonPrimary: "bg-rose-800 text-white hover:bg-rose-900",
    motif: "from-rose-100 to-emerald-50",
  },
]

export function getInviteTheme(id: InviteThemeId): InviteTheme {
  return INVITE_THEMES.find((t) => t.id === id) ?? INVITE_THEMES[0]!
}

export type VendorSubscriptionTier = "basic" | "featured"

export interface PlanRow {
  label: string
  free: string
  premium: string
  highlight?: boolean
}

export const FAMILY_PLAN_ROWS: PlanRow[] = [
  { label: "Events", free: "Up to 3", premium: "Unlimited", highlight: true },
  { label: "Guests", free: "Up to 50", premium: "Unlimited", highlight: true },
  { label: "Family collaborators", free: "2", premium: "Up to 8" },
  { label: "Invite themes", free: "Classic only", premium: "4 custom themes" },
  { label: "Seating planner", free: "—", premium: "Included" },
  { label: "Emergency backup priority", free: "Standard", premium: "Priority access" },
  { label: "Invite branding", free: '"Powered by" footer', premium: "Footer removed" },
]

export const VENDOR_PLAN_ROWS: PlanRow[] = [
  { label: "Browse placement", free: "Standard", premium: "Boosted in search", highlight: true },
  { label: "Profile badge", free: "Standard", premium: '"Featured" badge' },
  { label: "Booking requests", free: "Standard inbox", premium: "Early access indicator" },
  { label: "Emergency backup list", free: "Standard", premium: "Priority placement" },
  { label: "Categories listed", free: "1 category", premium: "Up to 3 categories" },
  { label: "Platform commission", free: "Standard rate", premium: "Reduced rate*" },
]

/** Sort vendors: featured subscription first, then featuredBoost, then rating */
export function sortVendorsForBrowse<
  T extends { subscriptionTier?: VendorSubscriptionTier; featuredBoost?: number; rating: number; featured?: boolean }
>(vendors: T[]): T[] {
  return [...vendors].sort((a, b) => {
    const tierA = a.subscriptionTier === "featured" ? 1 : 0
    const tierB = b.subscriptionTier === "featured" ? 1 : 0
    if (tierB !== tierA) return tierB - tierA
    const boostA = a.featuredBoost ?? (a.featured ? 1 : 0)
    const boostB = b.featuredBoost ?? (b.featured ? 1 : 0)
    if (boostB !== boostA) return boostB - boostA
    return b.rating - a.rating
  })
}

export function sortEmergencyBackups<
  T extends { subscriptionTier?: VendorSubscriptionTier; featuredBoost?: number }
>(vendors: T[], familyIsPremium: boolean): T[] {
  return [...vendors].sort((a, b) => {
    const featuredA = a.subscriptionTier === "featured" ? 1 : 0
    const featuredB = b.subscriptionTier === "featured" ? 1 : 0
    if (familyIsPremium && featuredB !== featuredA) return featuredB - featuredA
    return (b.featuredBoost ?? 0) - (a.featuredBoost ?? 0)
  })
}

export interface SeatingAssignment {
  guestId: string
  tableNumber: number
}

export interface CustomEvent {
  id: string
  name: string
  date: string
}

export const DEFAULT_VENDOR_CATEGORIES: VendorCategoryId[] = ["catering"]

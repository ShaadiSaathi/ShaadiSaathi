export const FAMILY_PREMIUM_PRICE_PKR = 3499
export const VENDOR_FEATURED_PRICE_PKR = 1999

export type InviteThemeId =
  | "classic"
  | "royal-maroon"
  | "ivory-gold"
  | "blush-floral"

export const INVITE_THEMES: Array<{
  id: InviteThemeId
  name: string
  description: string
  premium: boolean
}> = [
  {
    id: "classic",
    name: "Classic",
    description: "Default maroon & gold — warm and timeless.",
    premium: false,
  },
  {
    id: "royal-maroon",
    name: "Royal Maroon",
    description: "Deep plum tones with rich gold accents.",
    premium: true,
  },
  {
    id: "ivory-gold",
    name: "Ivory & Gold",
    description: "Luminous cream with gilded details.",
    premium: true,
  },
  {
    id: "blush-floral",
    name: "Blush Floral",
    description: "Soft rose and sage — perfect for mehndi vibes.",
    premium: true,
  },
]

export const FAMILY_PLAN_ROWS = [
  { label: "Events", free: "Up to 3", premium: "Unlimited" },
  { label: "Guests", free: "Up to 50", premium: "Unlimited" },
  { label: "Collaborators", free: "2", premium: "Up to 8" },
  { label: "Invite themes", free: "Classic", premium: "4 themes" },
  { label: "Seating planner", free: "—", premium: "Included" },
  { label: "Wedding AI", free: "—", premium: "Included" },
  { label: "PDF export", free: "—", premium: "Included" },
]

export const VENDOR_PLAN_ROWS = [
  { label: "Browse placement", free: "Standard", premium: "Boosted" },
  { label: "Profile badge", free: "Standard", premium: "Featured" },
  { label: "Booking requests", free: "Standard", premium: "Early access" },
  { label: "Emergency list", free: "Standard", premium: "Priority" },
]

export const VENDOR_CATEGORIES = [
  { id: "catering", label: "Catering" },
  { id: "photography", label: "Photography" },
  { id: "decor", label: "Decor" },
  { id: "mehndi-artists", label: "Mehndi artists" },
  { id: "bridal-makeup", label: "Bridal makeup" },
  { id: "sound-lighting", label: "Sound & lighting" },
  { id: "transport", label: "Transport" },
  { id: "tent-marquee", label: "Tent / marquee" },
  { id: "mehndi-entertainment", label: "Mehndi entertainment" },
  { id: "dholki-sangeet", label: "Dholki / sangeet" },
] as const

export const TABLE_COUNT = 12

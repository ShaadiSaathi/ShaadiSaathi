/**
 * Shaadi Saathi — mock vendor directory & bookings.
 * Swap for real vendor API / payments when backend is ready.
 */

import type { EventId } from "./mockData"
import type { VendorSubscriptionTier } from "./premium"
import { EVENTS, getRsvpSummary } from "./mockData"
import type { BookingPayment } from "./mockPayments"
import {
  createInitialPayment,
  enrichPaymentWithSchedule,
  MOCK_NOW,
} from "./mockPayments"

export type VendorCategoryId =
  | "catering"
  | "mehndi-entertainment"
  | "photography"
  | "decor"
  | "sound-lighting"
  | "mehndi-artists"
  | "bridal-makeup"
  | "transport"
  | "dholki-sangeet"
  | "tent-marquee"

export type BookingStatus = "requested" | "confirmed" | "declined" | "no_show"

export interface VendorCategory {
  id: VendorCategoryId
  label: string
  shortLabel: string
}

export interface VendorPackage {
  name: string
  price: number
  perHead?: boolean
  description: string
}

export interface VendorReview {
  id: string
  author: string
  location: string
  rating: number
  text: string
  eventType: string
}

export interface Vendor {
  id: string
  name: string
  categoryId: VendorCategoryId
  city: string
  rating: number
  reviewCount: number
  startingPrice: number
  bio: string
  /** PLACEHOLDER: replace with real image URLs */
  coverGradient: string
  galleryGradients: string[]
  packages?: VendorPackage[]
  reviews: VendorReview[]
  /** Event IDs where vendor is available; others show unavailable */
  availableFor: EventId[]
  featured?: boolean
  /** Monthly subscription tier — Featured vendors get boosted placement */
  subscriptionTier?: VendorSubscriptionTier
  /** Sort weight for browse / emergency backup lists (higher = first) */
  featuredBoost?: number
  /** Can be booked on short notice — shown in no-show backup flow */
  emergencyAvailable?: boolean
  reliabilityScore?: number
  noShowCount?: number
  suspended?: boolean
  /** Whether vendor accepts card payment on the event day */
  acceptsCardInPerson?: boolean
  /** Completed jobs on platform — used for "New to Shaadi Saathi" badge */
  completedJobsCount?: number
}

export interface VendorBooking {
  id: string
  vendorId: string
  eventId: EventId
  status: BookingStatus
  guestCount?: number
  packageName?: string
  price: number
  note?: string
  createdAt: string
  payment?: BookingPayment
  /** Counter-offer negotiation — max one round-trip in mock */
  counterOffer?: {
    price: number
    packageName?: string
    note?: string
    proposedAt: string
    proposedBy: "vendor" | "family"
  }
  negotiationRound?: number
}

export const VENDOR_CATEGORIES: VendorCategory[] = [
  { id: "catering", label: "Catering", shortLabel: "Catering" },
  { id: "mehndi-entertainment", label: "Mehndi Entertainment", shortLabel: "Entertainment" },
  { id: "photography", label: "Photography & Videography", shortLabel: "Photo/Video" },
  { id: "decor", label: "Decor & Stage", shortLabel: "Decor" },
  { id: "sound-lighting", label: "Sound & Lighting", shortLabel: "Sound" },
  { id: "mehndi-artists", label: "Mehndi Artists", shortLabel: "Mehndi" },
  { id: "bridal-makeup", label: "Bridal Wear & Makeup", shortLabel: "Bridal" },
  { id: "transport", label: "Transport", shortLabel: "Transport" },
  { id: "dholki-sangeet", label: "Dholki/Sangeet Performers", shortLabel: "Dholki" },
  { id: "tent-marquee", label: "Tent & Marquee", shortLabel: "Tent" },
]

/** Key categories tracked on Dashboard progress card */
export const ESSENTIAL_VENDOR_CATEGORIES: VendorCategoryId[] = [
  "catering",
  "photography",
  "decor",
  "mehndi-artists",
  "sound-lighting",
  "transport",
]

export const VENDORS: Vendor[] = [
  {
    id: "vendor-1",
    name: "Biryani & Barbecue Co.",
    categoryId: "catering",
    city: "Lahore",
    rating: 4.9,
    reviewCount: 124,
    startingPrice: 80000,
    bio: "Authentic Pakistani cuisine with live BBQ counters, high tea spreads, and elegant walima dinner service. Family-run since 1998.",
    coverGradient: "from-amber-200 via-orange-100 to-rose-100",
    galleryGradients: ["from-amber-300 to-orange-200", "from-rose-200 to-amber-100", "from-orange-200 to-yellow-100"],
    packages: [
      { name: "Silver", price: 1800, perHead: true, description: "3 main dishes, 1 dessert, soft drinks" },
      { name: "Gold", price: 2500, perHead: true, description: "5 mains, live BBQ, dessert bar, welcome drinks" },
      { name: "Platinum", price: 3500, perHead: true, description: "Full desi feast, live counters, premium desserts" },
    ],
    reviews: [
      { id: "r1", author: "Sana & Family", location: "Lahore", rating: 5, text: "The walima dinner was flawless — guests are still talking about the biryani.", eventType: "Walima" },
      { id: "r2", author: "Omar Khan", location: "Islamabad", rating: 5, text: "Live BBQ counter was the highlight of our mehndi night.", eventType: "Mehndi" },
    ],
    availableFor: ["mehndi", "baraat", "walima"],
    featured: true,
    emergencyAvailable: true,
    reliabilityScore: 98,
    noShowCount: 0,
    acceptsCardInPerson: true,
    completedJobsCount: 47,
  },
  {
    id: "vendor-2",
    name: "Royal Feast Caterers",
    categoryId: "catering",
    city: "Lahore",
    rating: 4.7,
    reviewCount: 89,
    startingPrice: 65000,
    bio: "Specialists in walima buffets and mehndi high tea. Halal certified, customizable menus for all dietary needs.",
    coverGradient: "from-emerald-100 via-amber-50 to-rose-50",
    galleryGradients: ["from-emerald-200 to-teal-100", "from-amber-100 to-rose-100"],
    packages: [
      { name: "Mehndi High Tea", price: 1200, perHead: true, description: "Samosas, pakoras, chai, mithai platter" },
      { name: "Walima Dinner", price: 2200, perHead: true, description: "Traditional dinner with 4 mains + dessert" },
    ],
    reviews: [
      { id: "r3", author: "Fatima & Hassan", location: "Karachi", rating: 4, text: "Beautiful presentation and generous portions.", eventType: "Walima" },
    ],
    availableFor: ["mehndi", "walima"],
    emergencyAvailable: true,
    reliabilityScore: 92,
    noShowCount: 0,
    acceptsCardInPerson: true,
    completedJobsCount: 31,
  },
  {
    id: "vendor-3",
    name: "Dhol Beats Lahore",
    categoryId: "mehndi-entertainment",
    city: "Lahore",
    rating: 4.8,
    reviewCount: 67,
    startingPrice: 45000,
    bio: "Professional dhol players, folk singers, and mehndi dance choreographers. We bring the energy your mehndi deserves.",
    coverGradient: "from-rose-200 via-maroon/20 to-gold/30",
    galleryGradients: ["from-rose-300 to-amber-200", "from-maroon/30 to-gold/20"],
    packages: [
      { name: "Dhol Duo", price: 45000, description: "2 dhol players, 3 hours" },
      { name: "Full Mehndi Night", price: 95000, description: "Dhol, folk singer, dance choreography" },
    ],
    reviews: [
      { id: "r4", author: "Amina & Adil", location: "Lahore", rating: 5, text: "Had the whole family dancing by the end of the night!", eventType: "Mehndi" },
    ],
    availableFor: ["mehndi"],
    featured: true,
    emergencyAvailable: true,
    reliabilityScore: 96,
    noShowCount: 0,
    acceptsCardInPerson: false,
    completedJobsCount: 22,
  },
  {
    id: "vendor-4",
    name: "Lens & Light Studios",
    categoryId: "photography",
    city: "Lahore",
    rating: 4.9,
    reviewCount: 156,
    startingPrice: 120000,
    bio: "Candid storytelling meets traditional portraits. Full wedding coverage with drone option and same-day highlights reel.",
    coverGradient: "from-slate-200 via-rose-50 to-amber-50",
    galleryGradients: ["from-slate-300 to-rose-100", "from-amber-100 to-rose-50", "from-rose-200 to-slate-100"],
    packages: [
      { name: "Essential", price: 120000, description: "1 photographer, all 3 events, 400 edited photos" },
      { name: "Premium", price: 220000, description: "Photo + video, drone, album, highlights film" },
    ],
    reviews: [
      { id: "r5", author: "Priya & Rajesh", location: "Mumbai", rating: 5, text: "Captured every emotion — the mehndi hands shots are stunning.", eventType: "Full Wedding" },
    ],
    availableFor: ["mehndi", "baraat", "walima"],
    featured: true,
    emergencyAvailable: false,
    reliabilityScore: 99,
    noShowCount: 0,
  },
  {
    id: "vendor-5",
    name: "Shaadi Frames",
    categoryId: "photography",
    city: "Islamabad",
    rating: 4.6,
    reviewCount: 72,
    startingPrice: 85000,
    bio: "Cinematic videography and traditional photography for South Asian weddings across Punjab.",
    coverGradient: "from-zinc-200 to-rose-100",
    galleryGradients: ["from-zinc-300 to-rose-200"],
    reviews: [
      { id: "r6", author: "Zainab & Imran", location: "Rawalpindi", rating: 4, text: "Professional team, delivered on time.", eventType: "Baraat" },
    ],
    availableFor: ["baraat", "walima"],
  },
  {
    id: "vendor-6",
    name: "Gulzar Decor Studio",
    categoryId: "decor",
    city: "Lahore",
    rating: 4.8,
    reviewCount: 98,
    startingPrice: 150000,
    bio: "Mehndi stages, floral mandaps, baraat entrances, and walima backdrops. We transform venues into dreamscapes.",
    coverGradient: "from-rose-100 via-pink-50 to-emerald-50",
    galleryGradients: ["from-rose-200 to-pink-100", "from-emerald-100 to-rose-50", "from-amber-100 to-rose-100"],
    packages: [
      { name: "Mehndi Stage", price: 85000, description: "Floral stage, seating, lighting" },
      { name: "Mandap & Walima", price: 200000, description: "Full baraat mandap + walima backdrop" },
    ],
    reviews: [
      { id: "r7", author: "Ayesha & Bilal", location: "Lahore", rating: 5, text: "The mandap looked like it was from a magazine.", eventType: "Baraat" },
    ],
    availableFor: ["mehndi", "baraat", "walima"],
    featured: true,
  },
  {
    id: "vendor-7",
    name: "DJ Raza & Sound Co.",
    categoryId: "sound-lighting",
    city: "Lahore",
    rating: 4.7,
    reviewCount: 83,
    startingPrice: 55000,
    bio: "Bollywood, Punjabi, and classic shaadi playlists. Professional sound system and dance floor lighting for every event.",
    coverGradient: "from-violet-100 via-maroon/10 to-gold/20",
    galleryGradients: ["from-violet-200 to-maroon/20"],
    packages: [
      { name: "Mehndi DJ", price: 55000, description: "4 hours, sound + basic lighting" },
      { name: "Full Wedding", price: 140000, description: "All events, premium sound, dance floor FX" },
    ],
    reviews: [
      { id: "r8", author: "Hina & Tariq", location: "Lahore", rating: 5, text: "Kept the dance floor packed all walima night.", eventType: "Walima" },
    ],
    availableFor: ["mehndi", "baraat", "walima"],
  },
  {
    id: "vendor-8",
    name: "Henna by Saba",
    categoryId: "mehndi-artists",
    city: "Lahore",
    rating: 5.0,
    reviewCount: 201,
    startingPrice: 35000,
    bio: "Bridal mehndi specialist with 12 years experience. Intricate traditional and contemporary designs for bride and guests.",
    coverGradient: "from-amber-100 via-rose-100 to-maroon/10",
    galleryGradients: ["from-amber-200 to-rose-200", "from-rose-300 to-amber-100"],
    packages: [
      { name: "Bridal Only", price: 35000, description: "Full bridal mehndi, both hands & feet" },
      { name: "Bridal + 10 Guests", price: 65000, description: "Bridal design + guest applications" },
    ],
    reviews: [
      { id: "r9", author: "Maryam", location: "Lahore", rating: 5, text: "My mehndi was the most beautiful I've ever had.", eventType: "Mehndi" },
    ],
    availableFor: ["mehndi"],
    featured: true,
  },
  {
    id: "vendor-9",
    name: "Glam by Nadia",
    categoryId: "bridal-makeup",
    city: "Lahore",
    rating: 4.9,
    reviewCount: 134,
    startingPrice: 40000,
    bio: "Bridal makeup and hairstyling for mehndi, baraat, and walima. Outfit draping and touch-up kits included.",
    coverGradient: "from-rose-50 via-amber-50 to-pink-100",
    galleryGradients: ["from-rose-200 to-pink-100"],
    packages: [
      { name: "Single Event", price: 40000, description: "Makeup + hair for one event" },
      { name: "Full Wedding", price: 95000, description: "All 3 events + trials" },
    ],
    reviews: [
      { id: "r10", author: "Dania", location: "Lahore", rating: 5, text: "Looked like myself, just the most radiant version.", eventType: "Baraat" },
    ],
    availableFor: ["mehndi", "baraat", "walima"],
  },
  {
    id: "vendor-10",
    name: "Baraat Motors & Decor",
    categoryId: "transport",
    city: "Lahore",
    rating: 4.5,
    reviewCount: 56,
    startingPrice: 75000,
    bio: "Decorated baraat cars, vintage options, and guest coaster booking for out-of-town family.",
    coverGradient: "from-amber-100 to-maroon/10",
    galleryGradients: ["from-amber-200 to-gold/30"],
    packages: [
      { name: "Baraat Car", price: 75000, description: "Decorated car + driver" },
      { name: "Guest Transport", price: 25000, description: "Coaster per trip, up to 25 guests" },
    ],
    reviews: [
      { id: "r11", author: "Kamran Family", location: "Lahore", rating: 4, text: "Car decoration was elegant, not over the top.", eventType: "Baraat" },
    ],
    availableFor: ["baraat"],
  },
  {
    id: "vendor-11",
    name: "Sangeet Symphony",
    categoryId: "dholki-sangeet",
    city: "Lahore",
    rating: 4.6,
    reviewCount: 44,
    startingPrice: 60000,
    bio: "Live band and dance troupe for dholki and sangeet nights. Classic geet and modern mashups.",
    coverGradient: "from-purple-100 via-rose-50 to-amber-50",
    galleryGradients: ["from-purple-200 to-rose-100"],
    reviews: [
      { id: "r12", author: "Saima & Faisal", location: "Lahore", rating: 5, text: "The dholki felt like a proper concert!", eventType: "Mehndi" },
    ],
    availableFor: ["mehndi"],
  },
  {
    id: "vendor-12",
    name: "Shamiana Kings",
    categoryId: "tent-marquee",
    city: "Lahore",
    rating: 4.4,
    reviewCount: 38,
    startingPrice: 200000,
    bio: "Outdoor shamiana, flooring, seating, and climate control for large guest counts.",
    coverGradient: "from-emerald-50 to-amber-100",
    galleryGradients: ["from-emerald-100 to-amber-50"],
    packages: [
      { name: "Standard Shamiana", price: 200000, description: "Up to 300 guests, basic seating" },
      { name: "Premium Setup", price: 450000, description: "Full flooring, AC, premium seating" },
    ],
    reviews: [
      { id: "r13", author: "Rabia & Usman", location: "Faisalabad", rating: 4, text: "Handled rain backup professionally.", eventType: "Walima" },
    ],
    availableFor: ["baraat", "walima"],
  },
  {
    id: "vendor-13",
    name: "Spice Route Kitchen",
    categoryId: "catering",
    city: "Karachi",
    rating: 4.8,
    reviewCount: 91,
    startingPrice: 90000,
    bio: "Karachi's favourite desi caterers — live karahi, chaat counters, and premium walima spreads.",
    coverGradient: "from-orange-100 to-red-50",
    galleryGradients: ["from-orange-200 to-amber-100"],
    reviews: [
      { id: "r14", author: "Nadia", location: "Karachi", rating: 5, text: "Guests from Lahore said it was the best food of the wedding.", eventType: "Walima" },
    ],
    availableFor: ["walima"],
  },
  {
    id: "vendor-14",
    name: "Mehndi Motion",
    categoryId: "mehndi-entertainment",
    city: "Lahore",
    rating: 4.5,
    reviewCount: 29,
    startingPrice: 38000,
    bio: "Folk singers and interactive mehndi games. Perfect for intimate family mehndis.",
    coverGradient: "from-rose-100 to-amber-50",
    galleryGradients: ["from-rose-200 to-gold/20"],
    reviews: [],
    availableFor: ["mehndi"],
    emergencyAvailable: false,
    reliabilityScore: 72,
    noShowCount: 1,
  },
]

/** Pre-populated bookings with payment states for demo */
export const INITIAL_BOOKINGS: VendorBooking[] = [
  {
    id: "booking-1",
    vendorId: "vendor-1",
    eventId: "walima",
    status: "confirmed",
    guestCount: 280,
    packageName: "Gold",
    price: 700000,
    note: "Vegetarian options for 20 guests",
    createdAt: "2026-06-15",
    payment: enrichPaymentWithSchedule(
      {
        ...createInitialPayment(700000, "in_person", "cash"),
        balanceStatus: "due_in_person",
      },
      "walima"
    ),
  },
  {
    id: "booking-2",
    vendorId: "vendor-4",
    eventId: "baraat",
    status: "confirmed",
    packageName: "Premium",
    price: 220000,
    createdAt: "2026-06-20",
    payment: enrichPaymentWithSchedule(
      {
        ...createInitialPayment(220000, "online"),
        depositStatus: "held",
        balanceStatus: "pending_online",
        scheduledArrivalAt: "2026-07-11T09:00:00.000Z",
        gracePeriodEndsAt: "2026-07-11T11:00:00.000Z",
      },
      "baraat"
    ),
  },
  {
    id: "booking-3",
    vendorId: "vendor-8",
    eventId: "mehndi",
    status: "requested",
    packageName: "Bridal + 10 Guests",
    price: 65000,
    createdAt: "2026-07-01",
    counterOffer: {
      price: 72000,
      packageName: "Bridal + 12 Guests",
      note: "Includes premium organic henna — 2 extra guests included",
      proposedAt: "2026-07-08",
      proposedBy: "vendor",
    },
    negotiationRound: 1,
  },
  {
    id: "booking-4",
    vendorId: "vendor-7",
    eventId: "walima",
    status: "requested",
    packageName: "Full Wedding",
    price: 140000,
    createdAt: "2026-07-05",
  },
  {
    id: "booking-5",
    vendorId: "vendor-14",
    eventId: "mehndi",
    status: "no_show",
    packageName: "Full Mehndi Night",
    price: 95000,
    createdAt: "2026-06-01",
    payment: {
      ...createInitialPayment(95000, "online"),
      depositStatus: "refunded",
      balanceStatus: "pending_online",
      scheduledArrivalAt: "2026-07-09T18:00:00.000Z",
      gracePeriodEndsAt: "2026-07-09T20:00:00.000Z",
      refundAmount: Math.round(95000 * 0.275),
      refundConfirmedAt: MOCK_NOW.toISOString(),
    },
  },
  {
    id: "booking-6",
    vendorId: "vendor-6",
    eventId: "baraat",
    status: "confirmed",
    packageName: "Mandap & Walima",
    price: 200000,
    createdAt: "2026-06-25",
    payment: enrichPaymentWithSchedule(
      {
        ...createInitialPayment(200000, "in_person", "card"),
        depositStatus: "released",
        balanceStatus: "paid_in_person",
        checkInAt: "2026-07-10T10:30:00.000Z",
        checkInStatus: "confirmed",
        checkInPhoto: {
          name: "mandap-setup.jpg",
          previewUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f5e6d3' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236A1B4D' font-size='12'%3ESetup photo%3C/text%3E%3C/svg%3E",
          uploadedAt: "2026-07-10T10:30:00.000Z",
        },
        balanceMarkedPaidAt: "2026-07-10T14:00:00.000Z",
        messages: [
          { id: "m1", sender: "family", text: "Can you arrive by 9 AM for setup?", sentAt: "2026-07-09T14:00:00.000Z" },
          { id: "m2", sender: "vendor", text: "Yes, team will be there by 8:30 AM.", sentAt: "2026-07-09T15:30:00.000Z" },
          { id: "m3", sender: "family", text: "Perfect, see you then!", sentAt: "2026-07-09T16:00:00.000Z" },
        ],
      },
      "baraat"
    ),
  },
]

// --- Helpers ---

export function getVendorById(id: string): Vendor | undefined {
  const v = VENDORS.find((item) => item.id === id)
  if (!v) return undefined
  const isFeatured = v.featured ?? v.subscriptionTier === "featured"
  return {
    emergencyAvailable: false,
    reliabilityScore: 90,
    noShowCount: 0,
    suspended: false,
    acceptsCardInPerson: false,
    completedJobsCount: 8,
    subscriptionTier: isFeatured ? "featured" : "basic",
    featuredBoost: isFeatured ? (v.featuredBoost ?? 10) : (v.featuredBoost ?? 0),
    ...v,
    featured: isFeatured,
  }
}

export function getAllVendors(): Vendor[] {
  return VENDORS.map((v) => getVendorById(v.id)!)
}

export function getCategoryById(id: VendorCategoryId): VendorCategory | undefined {
  return VENDOR_CATEGORIES.find((c) => c.id === id)
}

export function formatPrice(amount: number, perHead = false): string {
  const formatted = `Rs. ${amount.toLocaleString("en-PK")}`
  return perHead ? `${formatted}/head` : formatted
}

export function formatStartingPrice(amount: number): string {
  return `Starting from Rs. ${amount.toLocaleString("en-PK")}`
}

/** Sum of booking prices for an event (confirmed + requested) */
export function getEventBookingSpend(
  eventId: EventId,
  bookings: VendorBooking[] = INITIAL_BOOKINGS
): number {
  return bookings
    .filter(
      (b) =>
        b.eventId === eventId &&
        (b.status === "confirmed" || b.status === "requested")
    )
    .reduce((sum, b) => sum + b.price, 0)
}

export function getDefaultGuestCount(eventId: EventId): number {
  return getRsvpSummary(eventId).confirmed
}

export function getEventAvailability(vendor: Vendor, eventId: EventId) {
  const event = EVENTS.find((e) => e.id === eventId)
  const available = vendor.availableFor.includes(eventId)
  return {
    available,
    event,
    label: event
      ? available
        ? `Available for your ${event.name} (${new Date(event.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })})`
        : `Not available for ${event.name}`
      : "",
  }
}

export function getBookingProgress(bookings: VendorBooking[]) {
  const bookedCategories = new Set<VendorCategoryId>()
  for (const booking of bookings) {
    if (booking.status === "declined" || booking.status === "no_show") continue
    const vendor = getVendorById(booking.vendorId)
    if (vendor) bookedCategories.add(vendor.categoryId)
  }
  const bookedEssential = ESSENTIAL_VENDOR_CATEGORIES.filter((c) =>
    bookedCategories.has(c)
  ).length
  return {
    booked: bookedEssential,
    total: ESSENTIAL_VENDOR_CATEGORIES.length,
    bookedCategories,
  }
}

export const CITIES = [...new Set(VENDORS.map((v) => v.city))].sort()

export const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under Rs. 50,000", min: 0, max: 50000 },
  { label: "Rs. 50,000 – 100,000", min: 50000, max: 100000 },
  { label: "Rs. 100,000 – 200,000", min: 100000, max: 200000 },
  { label: "Rs. 200,000+", min: 200000, max: Infinity },
] as const

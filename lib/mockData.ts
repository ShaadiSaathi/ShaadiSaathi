/**
 * Shaadi Saathi — mock data for demo screens.
 * Swap this file for real API/Convex queries when backend is ready.
 */

import type { VendorCategoryId } from "./mockVendors"

export type EventId = "mehndi" | "baraat" | "walima"

export type RsvpStatus = "confirmed" | "pending" | "declined" | "cancelled"

export type RsvpSource = "guest" | "organiser"

export type TaskStatus = "todo" | "in_progress" | "done"

export type FamilyRole = "owner" | "planner" | "viewer"

export interface EventTimelineEntry {
  id: string
  time: string
  label: string
}

export interface EventMoodPhoto {
  id: string
  name: string
  /** Mock preview — data URL or gradient placeholder */
  previewUrl: string
}

export interface WeddingEvent {
  id: EventId
  name: string
  date: string // ISO date
  time: string
  venue: string
  address: string
  latitude: number
  longitude: number
  /** Maximum guest capacity at this venue */
  capacity: number
  /** Organiser-set budget target for vendor spend (PKR) */
  budgetTarget: number
  /** Default organiser notes — editable on Event Detail page */
  organiserNotes: string
  /** Day-of run-of-show timeline for this event */
  daySchedule: EventTimelineEntry[]
  /** Decor / outfit inspiration mood board */
  moodPhotos: EventMoodPhoto[]
  color: string // tailwind bg class for chips
  chipColor: string
  description: string
}

export interface Guest {
  id: string
  name: string
  phone: string
  events: EventId[]
  rsvp: Record<EventId, RsvpStatus | null>
  /** Who last set each event's RSVP */
  rsvpSource: Record<EventId, RsvpSource | null>
  /** Unique token for shareable invite link — /invite/[inviteToken] */
  inviteToken: string
  notes?: string
}

export interface Task {
  id: string
  title: string
  assigneeId: string
  dueDate: string
  status: TaskStatus
  eventId?: EventId
  priority?: "low" | "medium" | "high"
}

export interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  initials: string
}

export interface Wedding {
  id: string
  name: string
  couple: string
  shareCode: string
  shareLink: string
  /** One-time Premium unlock for this wedding */
  isPremium?: boolean
}

export const CURRENT_USER = {
  id: "user-ayesha",
  name: "Ayesha",
  initials: "A",
} as const

export const WEDDING: Wedding = {
  id: "wedding-1",
  name: "Ayesha & Bilal's Wedding",
  couple: "Ayesha & Bilal",
  shareCode: "AHMED-2026",
  shareLink: "https://shaadisaathi.app/join/AHMED-2026",
  isPremium: false,
}

/** Public slug for general wedding invite link — /invite/wedding/[token] */
export const WEDDING_PUBLIC_INVITE_TOKEN = "ayesha-bilal-2026"

export const EVENTS: WeddingEvent[] = [
  {
    id: "mehndi",
    name: "Mehndi",
    date: "2026-08-08",
    time: "6:00 PM",
    venue: "Garden Terrace, Pearl Continental",
    address: "Shahrah-e-Quaid-e-Azam, Lahore",
    latitude: 31.5497,
    longitude: 74.3436,
    capacity: 250,
    budgetTarget: 450000,
    organiserNotes:
      "Dress code: traditional festive — yellows, greens, and florals. Please remind caterer about the chai station near the entrance. Theme colors: marigold & emerald.",
    daySchedule: [
      { id: "mehndi-1", time: "5:30 PM", label: "Guest arrival & welcome drinks" },
      { id: "mehndi-2", time: "6:00 PM", label: "Mehndi application begins" },
      { id: "mehndi-3", time: "6:30 PM", label: "Dholki performance" },
      { id: "mehndi-4", time: "7:30 PM", label: "High tea & snacks service" },
      { id: "mehndi-5", time: "9:00 PM", label: "Family photos on terrace" },
      { id: "mehndi-6", time: "10:30 PM", label: "Event wrap-up" },
    ],
    moodPhotos: [
      {
        id: "mehndi-photo-1",
        name: "Marigold terrace decor",
        previewUrl:
          "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #059669 100%)",
      },
      {
        id: "mehndi-photo-2",
        name: "Mehndi outfit palette",
        previewUrl:
          "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #86efac 100%)",
      },
    ],
    color: "bg-rose-100",
    chipColor: "bg-rose-200 text-rose-900",
    description:
      "An evening of mehndi, music, and family celebrations. Traditional attire encouraged.",
  },
  {
    id: "baraat",
    name: "Baraat",
    date: "2026-08-10",
    time: "11:00 AM",
    venue: "Grand Ballroom, Avari Hotel",
    address: "Egerton Road, Lahore",
    latitude: 31.549,
    longitude: 74.337,
    capacity: 400,
    budgetTarget: 850000,
    organiserNotes:
      "Nikah at 12:30 PM sharp — coordinate with imam. Lunch service for 350 seated guests. Mandap flowers: white & gold. Transport for baraat leaves from groom's house at 10:15 AM.",
    daySchedule: [
      { id: "baraat-1", time: "10:15 AM", label: "Baraat procession departs" },
      { id: "baraat-2", time: "11:00 AM", label: "Baraat arrival at venue" },
      { id: "baraat-3", time: "11:30 AM", label: "Guest seating in ballroom" },
      { id: "baraat-4", time: "12:30 PM", label: "Nikah ceremony" },
      { id: "baraat-5", time: "1:15 PM", label: "Lunch service begins" },
      { id: "baraat-6", time: "3:00 PM", label: "Rukhsati & departure" },
    ],
    moodPhotos: [
      {
        id: "baraat-photo-1",
        name: "Mandap white & gold",
        previewUrl:
          "linear-gradient(135deg, #fffbeb 0%, #fde68a 30%, #ffffff 100%)",
      },
      {
        id: "baraat-photo-2",
        name: "Stage floral reference",
        previewUrl:
          "linear-gradient(135deg, #fce7f3 0%, #fef9c3 50%, #ecfdf5 100%)",
      },
    ],
    color: "bg-amber-100",
    chipColor: "bg-amber-200 text-amber-900",
    description:
      "The baraat procession and nikah ceremony. Lunch to follow in the main hall.",
  },
  {
    id: "walima",
    name: "Walima",
    date: "2026-08-12",
    time: "7:30 PM",
    venue: "Royal Orchid Banquet",
    address: "DHA Phase 5, Lahore",
    latitude: 31.467,
    longitude: 74.397,
    capacity: 300,
    budgetTarget: 1200000,
    organiserNotes:
      "Formal attire — no casual wear. Seating chart finalized by Aug 8. VIP table near stage for elders. Decor theme: ivory, gold, and deep maroon. Dessert table opens after main course.",
    daySchedule: [
      { id: "walima-1", time: "5:00 PM", label: "Vendor setup & decor final checks" },
      { id: "walima-2", time: "6:30 PM", label: "Guest arrival & welcome" },
      { id: "walima-3", time: "7:30 PM", label: "Couple entrance" },
      { id: "walima-4", time: "8:00 PM", label: "Dinner service" },
      { id: "walima-5", time: "9:30 PM", label: "Dessert & chai" },
      { id: "walima-6", time: "10:30 PM", label: "Thank-you & farewell" },
    ],
    moodPhotos: [
      {
        id: "walima-photo-1",
        name: "Ivory & gold tablescape",
        previewUrl:
          "linear-gradient(135deg, #fff7ed 0%, #fde68a 40%, #6A1B4D 100%)",
      },
      {
        id: "walima-photo-2",
        name: "Stage backdrop inspiration",
        previewUrl:
          "linear-gradient(135deg, #4a044e 0%, #881337 50%, #b45309 100%)",
      },
      {
        id: "walima-photo-3",
        name: "Floral centerpieces",
        previewUrl:
          "linear-gradient(135deg, #fdf2f8 0%, #fef3c7 50%, #ecfdf5 100%)",
      },
    ],
    color: "bg-emerald-100",
    chipColor: "bg-emerald-200 text-emerald-900",
    description:
      "Walima dinner reception for family and friends. Formal attire.",
  },
]

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: "user-ayesha", name: "Ayesha", role: "owner", initials: "A" },
  { id: "user-bilal", name: "Bilal", role: "planner", initials: "B" },
  { id: "user-sana", name: "Sana (Sister)", role: "planner", initials: "S" },
  { id: "user-uncle-rashid", name: "Uncle Rashid", role: "planner", initials: "R" },
  { id: "user-ammi", name: "Ammi", role: "viewer", initials: "AM" },
]

const FIRST_NAMES = [
  "Fatima", "Hassan", "Zainab", "Omar", "Maryam", "Ali", "Sara", "Imran",
  "Nadia", "Kamran", "Hina", "Tariq", "Saima", "Faisal", "Rabia", "Usman",
  "Amina", "Bilal", "Layla", "Yusuf", "Noor", "Hamza", "Dania", "Arif",
  "Mehreen", "Saad", "Anaya", "Waqar", "Hira", "Junaid", "Sana", "Adil",
  "Zara", "Rehan", "Amna", "Kashif", "Iqra", "Nabeel", "Sadia", "Farhan",
] as const

function seededRsvp(index: number, eventIndex: number): RsvpStatus {
  const roll = (index * 7 + eventIndex * 3) % 10
  if (roll < 6) return "confirmed"
  if (roll < 9) return "pending"
  return "declined"
}

function makeInviteToken(id: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20)
  return `${slug}-${id.replace("guest-", "")}`
}

function emptyRsvpFields(events: EventId[]) {
  const rsvp = {
    mehndi: events.includes("mehndi") ? ("pending" as RsvpStatus) : null,
    baraat: events.includes("baraat") ? ("pending" as RsvpStatus) : null,
    walima: events.includes("walima") ? ("pending" as RsvpStatus) : null,
  } satisfies Record<EventId, RsvpStatus | null>

  const rsvpSource = {
    mehndi: events.includes("mehndi") ? ("organiser" as RsvpSource) : null,
    baraat: events.includes("baraat") ? ("organiser" as RsvpSource) : null,
    walima: events.includes("walima") ? ("organiser" as RsvpSource) : null,
  } satisfies Record<EventId, RsvpSource | null>

  return { rsvp, rsvpSource }
}

/** ~40 guests with varied event tags and RSVP statuses */
export const GUESTS: Guest[] = FIRST_NAMES.map((name, i) => {
  const id = `guest-${i + 1}`
  const fullName = `${name} ${i % 4 === 0 ? "Khan" : i % 4 === 1 ? "Ahmed" : i % 4 === 2 ? "Malik" : "Sheikh"}`
  const events: EventId[] =
    i % 5 === 0
      ? ["mehndi", "baraat", "walima"]
      : i % 3 === 0
        ? ["baraat", "walima"]
        : i % 2 === 0
          ? ["mehndi", "baraat"]
          : ["walima"]

  const rsvp = {
    mehndi: events.includes("mehndi") ? seededRsvp(i, 0) : null,
    baraat: events.includes("baraat") ? seededRsvp(i, 1) : null,
    walima: events.includes("walima") ? seededRsvp(i, 2) : null,
  } satisfies Record<EventId, RsvpStatus | null>

  // Demo: first guest self-confirmed mehndi; second guest self-declined walima
  const rsvpSource = {
    mehndi: events.includes("mehndi") ? (i === 0 ? "guest" : "organiser") : null,
    baraat: events.includes("baraat") ? "organiser" : null,
    walima: events.includes("walima") ? (i === 1 ? "guest" : "organiser") : null,
  } satisfies Record<EventId, RsvpSource | null>

  return {
    id,
    name: fullName,
    phone: `+92 3${String(10 + (i % 9)).padStart(2, "0")} ••• ••${String(10 + i).slice(-2)}`,
    events,
    rsvp,
    rsvpSource,
    inviteToken: makeInviteToken(id, fullName),
  }
})

export const TASKS: Task[] = [
  {
    id: "task-1",
    title: "Confirm mehndi artist booking",
    assigneeId: "user-sana",
    dueDate: "2026-07-20",
    status: "done",
    eventId: "mehndi",
    priority: "high",
  },
  {
    id: "task-2",
    title: "Finalize baraat menu with caterer",
    assigneeId: "user-uncle-rashid",
    dueDate: "2026-07-25",
    status: "in_progress",
    eventId: "baraat",
    priority: "high",
  },
  {
    id: "task-3",
    title: "Order walima invitation cards",
    assigneeId: "user-ayesha",
    dueDate: "2026-07-18",
    status: "done",
    eventId: "walima",
    priority: "medium",
  },
  {
    id: "task-4",
    title: "Book dholki performers",
    assigneeId: "user-bilal",
    dueDate: "2026-07-22",
    status: "todo",
    eventId: "mehndi",
    priority: "medium",
  },
  {
    id: "task-5",
    title: "Arrange guest transportation (baraat)",
    assigneeId: "user-uncle-rashid",
    dueDate: "2026-08-01",
    status: "todo",
    eventId: "baraat",
    priority: "high",
  },
  {
    id: "task-6",
    title: "Confirm floral mandap design",
    assigneeId: "user-sana",
    dueDate: "2026-07-28",
    status: "in_progress",
    eventId: "baraat",
    priority: "medium",
  },
  {
    id: "task-7",
    title: "Send walima venue layout to decorator",
    assigneeId: "user-ayesha",
    dueDate: "2026-08-05",
    status: "todo",
    eventId: "walima",
    priority: "low",
  },
  {
    id: "task-8",
    title: "Create seating chart for walima",
    assigneeId: "user-bilal",
    dueDate: "2026-08-08",
    status: "todo",
    eventId: "walima",
    priority: "medium",
  },
]

// --- Helpers (swap for server functions later) ---

export function getEventById(id: string): WeddingEvent | undefined {
  return EVENTS.find((e) => e.id === id)
}

export function getGuestCountForEvent(eventId: EventId): number {
  return GUESTS.filter((g) => g.events.includes(eventId)).length
}

export function getRsvpSummary(eventId: EventId, guestList: Guest[] = GUESTS) {
  const invited = guestList.filter((g) => g.events.includes(eventId))
  return {
    confirmed: invited.filter((g) => g.rsvp[eventId] === "confirmed").length,
    pending: invited.filter((g) => g.rsvp[eventId] === "pending").length,
    declined: invited.filter((g) => g.rsvp[eventId] === "declined").length,
    cancelled: invited.filter((g) => g.rsvp[eventId] === "cancelled").length,
    total: invited.length,
  }
}

export function getGuestByInviteToken(token: string, guestList: Guest[] = GUESTS): Guest | undefined {
  return guestList.find((g) => g.inviteToken === token)
}

export function createGuestInviteUrl(token: string, origin = "http://localhost:3000"): string {
  return `${origin}/invite/${token}`
}

export function createWeddingInviteUrl(origin = "http://localhost:3000"): string {
  return `${origin}/invite/wedding/${WEDDING_PUBLIC_INVITE_TOKEN}`
}

/** Build a new guest record with defaults */
export function createGuest(input: {
  name: string
  phone?: string
  events: EventId[]
}): Guest {
  const id = `guest-${Date.now()}`
  const { rsvp, rsvpSource } = emptyRsvpFields(input.events)
  return {
    id,
    name: input.name.trim(),
    phone: input.phone ?? "+92 3XX ••• ••00",
    events: input.events,
    rsvp,
    rsvpSource,
    inviteToken: makeInviteToken(id, input.name.trim()),
  }
}

export function getDaysUntil(dateIso: string, from = new Date("2026-07-11")): number {
  const target = new Date(dateIso)
  const diff = target.getTime() - from.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function formatEventDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function formatFullDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function getTotalRsvpStats(guestList: Guest[] = GUESTS) {
  let confirmed = 0
  let pending = 0
  for (const guest of guestList) {
    for (const eventId of guest.events) {
      const status = guest.rsvp[eventId]
      if (status === "confirmed") confirmed++
      if (status === "pending") pending++
    }
  }
  return { confirmed, pending, totalInvites: confirmed + pending + countDeclined(guestList) }
}

function countDeclined(guestList: Guest[] = GUESTS): number {
  let declined = 0
  for (const guest of guestList) {
    for (const eventId of guest.events) {
      if (guest.rsvp[eventId] === "declined") declined++
    }
  }
  return declined
}

export function getTaskStats() {
  const done = TASKS.filter((t) => t.status === "done").length
  const outstanding = TASKS.filter((t) => t.status !== "done").length
  return { done, outstanding, total: TASKS.length }
}

export function getFamilyMember(id: string): FamilyMember | undefined {
  return FAMILY_MEMBERS.find((m) => m.id === id)
}

export function getNextUpcomingEvent(from = new Date("2026-07-11")): WeddingEvent | undefined {
  return [...EVENTS]
    .filter((e) => new Date(e.date) >= from)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

export function getTasksForEvent(eventId: EventId, tasks: Task[] = TASKS): Task[] {
  return tasks.filter((t) => t.eventId === eventId)
}

export function getEventTaskStats(eventId: EventId, tasks: Task[] = TASKS) {
  const eventTasks = getTasksForEvent(eventId, tasks)
  const done = eventTasks.filter((t) => t.status === "done").length
  return { done, total: eventTasks.length, outstanding: eventTasks.length - done }
}

/** Upcoming incomplete tasks for an event, sorted by due date */
export function getUpcomingTasksForEvent(
  eventId: EventId,
  limit = 3,
  tasks: Task[] = TASKS
): Task[] {
  return getTasksForEvent(eventId, tasks)
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit)
}

export function getGoogleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Suggested vendor categories to browse for each event type */
export const EVENT_VENDOR_CATEGORIES: Record<EventId, VendorCategoryId[]> = {
  mehndi: ["mehndi-artists", "mehndi-entertainment", "catering", "photography"],
  baraat: ["catering", "decor", "photography", "transport", "sound-lighting"],
  walima: ["catering", "decor", "photography", "sound-lighting"],
}

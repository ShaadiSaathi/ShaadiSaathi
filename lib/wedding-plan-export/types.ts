/**
 * Shared snapshot types for the premium wedding-plan PDF export.
 * Pure data — no UI or Firestore SDK imports.
 */

import type { EventId, RsvpStatus, TaskStatus } from "@/lib/mockData"
import type { BookingStatus } from "@/lib/mockVendors"

export type WeddingPlanExportEvent = {
  id: EventId | string
  name: string
  date: string
  time: string
  venue: string
  address: string
  budgetTarget?: number
  schedule: Array<{ time: string; label: string }>
}

export type WeddingPlanExportGuestRow = {
  name: string
  events: string
  rsvpSummary: string
  partySize: number
  kind: "individual" | "group"
}

export type WeddingPlanExportBooking = {
  vendorName: string
  service: string
  eventName: string
  eventDate: string
  status: BookingStatus | string
  /** Omitted when exporter lacks financial access */
  amountPkr?: number
}

export type WeddingPlanExportTask = {
  title: string
  assignee: string
  dueDate: string
  status: TaskStatus | string
  eventName?: string
  priority?: string
}

export type WeddingPlanExportBudget = {
  eventName: string
  targetPkr: number
  bookedSpendPkr: number
}

export type WeddingPlanExportSnapshot = {
  weddingName: string
  couple: string
  organiserName: string
  firstEventDate: string
  plannedEventLabels: string[]
  exportedAtIso: string
  exportedByName: string
  includeFinancials: boolean
  events: WeddingPlanExportEvent[]
  guestStats: {
    households: number
    headcount: number
    confirmed: number
    declined: number
    pending: number
  }
  guests: WeddingPlanExportGuestRow[]
  bookings: WeddingPlanExportBooking[]
  tasks: WeddingPlanExportTask[]
  budgetByEvent: WeddingPlanExportBudget[]
  budgetTierLabel?: string
}

/** Optional client-provided day-of timelines (stored locally, not in Firestore). */
export type WeddingPlanExportClientPayload = {
  daySchedules?: Partial<
    Record<EventId, Array<{ time: string; label: string }>>
  >
}

export type GuestRsvpMap = Partial<Record<EventId, RsvpStatus | null>>

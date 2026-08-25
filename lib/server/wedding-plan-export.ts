/**
 * Assemble a read-only wedding plan snapshot for PDF export (Admin SDK).
 */

import {
  canAccessWeddingFinancialData,
  getCollaboratorRole,
  type CollaboratorAccessMap,
} from "@/lib/collaborator-access"
import type {
  FirestoreBooking,
  FirestoreGuest,
  FirestoreTask,
  FirestoreWedding,
} from "@/lib/firebase/types"
import { EVENTS, type EventId } from "@/lib/mockData"
import { PaymentAuthError } from "@/lib/server/payment-auth"
import { getAdminDb } from "@/lib/server/firebase-admin"
import {
  WEDDING_BUDGET_TIER_OPTIONS,
  WEDDING_PLANNING_EVENT_OPTIONS,
  type WeddingPlanningPreferences,
} from "@/lib/wedding-preferences"
import type {
  WeddingPlanExportClientPayload,
  WeddingPlanExportSnapshot,
} from "@/lib/wedding-plan-export/types"

export type { WeddingPlanExportSnapshot } from "@/lib/wedding-plan-export/types"
export {
  formatExportFilename,
  formatPkr,
  formatExportDate,
} from "@/lib/wedding-plan-export/format"

function guestPartySize(guest: FirestoreGuest): number {
  if (guest.kind === "group" && typeof guest.partySize === "number" && guest.partySize > 0) {
    return guest.partySize
  }
  return 1
}

function eventName(id: string): string {
  return EVENTS.find((e) => e.id === id)?.name ?? id
}

function formatRsvpSummary(guest: FirestoreGuest): string {
  const parts: string[] = []
  for (const eventId of guest.events) {
    const status = guest.rsvp?.[eventId] ?? "pending"
    const label = eventName(eventId)
    parts.push(`${label}: ${status}`)
  }
  return parts.join(" · ") || "—"
}

function plannedEventLabels(prefs?: WeddingPlanningPreferences): string[] {
  const planned = prefs?.plannedEvents
  if (!planned?.length) {
    return EVENTS.map((e) => e.name)
  }
  return planned.map((id) => {
    const opt = WEDDING_PLANNING_EVENT_OPTIONS.find((o) => o.value === id)
    return opt?.label ?? id
  })
}

function budgetTierLabel(prefs?: WeddingPlanningPreferences): string | undefined {
  if (!prefs?.budgetTier) return undefined
  return (
    WEDDING_BUDGET_TIER_OPTIONS.find((o) => o.value === prefs.budgetTier)?.label ??
    prefs.budgetTier
  )
}

function resolveEvents(
  wedding: FirestoreWedding,
  daySchedules: WeddingPlanExportClientPayload["daySchedules"],
  includeFinancials: boolean
): WeddingPlanExportSnapshot["events"] {
  return EVENTS.map((base) => {
    const override = wedding.eventOverrides?.[base.id]
    const schedule = (daySchedules?.[base.id] ?? []).map((row) => ({
      time: row.time,
      label: row.label,
    }))
    return {
      id: base.id,
      name: base.name,
      date: override?.date ?? base.date,
      time: override?.time ?? base.time,
      venue: base.venue,
      address: base.address,
      budgetTarget: includeFinancials ? base.budgetTarget : undefined,
      schedule,
    }
  })
}

export async function buildWeddingPlanExportSnapshot(input: {
  uid: string
  weddingId: string
  payload?: WeddingPlanExportClientPayload
  exportedByName?: string
}): Promise<WeddingPlanExportSnapshot> {
  const db = getAdminDb()
  const weddingSnap = await db.collection("weddings").doc(input.weddingId).get()
  if (!weddingSnap.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }

  const wedding = {
    id: weddingSnap.id,
    ...(weddingSnap.data() as Omit<FirestoreWedding, "id">),
  } as FirestoreWedding & { collaboratorAccess?: CollaboratorAccessMap }

  const members = wedding.memberUids ?? []
  const isMember =
    wedding.ownerId === input.uid || members.includes(input.uid)
  if (!isMember) {
    throw new PaymentAuthError(403, "You are not a member of this wedding")
  }
  if (!wedding.isPremium) {
    throw new PaymentAuthError(403, "Premium required to export a wedding plan")
  }

  const role = getCollaboratorRole(wedding, input.uid)
  if (role !== "owner" && role !== "full") {
    throw new PaymentAuthError(
      403,
      "Only the wedding owner or a full collaborator can export the wedding plan"
    )
  }

  const includeFinancials = canAccessWeddingFinancialData(wedding, input.uid)

  const [guestsSnap, bookingsSnap, tasksSnap] = await Promise.all([
    db.collection("guests").where("weddingId", "==", input.weddingId).get(),
    db.collection("bookings").where("weddingId", "==", input.weddingId).get(),
    db.collection("tasks").where("weddingId", "==", input.weddingId).get(),
  ])

  const guests = guestsSnap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<FirestoreGuest, "id">) }) as FirestoreGuest
  )
  const bookings = bookingsSnap.docs.map(
    (d) =>
      ({ id: d.id, ...(d.data() as Omit<FirestoreBooking, "id">) }) as FirestoreBooking
  )
  const tasks = tasksSnap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<FirestoreTask, "id">) }) as FirestoreTask
  )

  let confirmed = 0
  let declined = 0
  let pending = 0
  let headcount = 0
  for (const guest of guests) {
    const heads = guestPartySize(guest)
    headcount += heads
    for (const eventId of guest.events as EventId[]) {
      const status = guest.rsvp?.[eventId]
      if (status === "confirmed") confirmed += heads
      else if (status === "declined" || status === "cancelled") declined += heads
      else pending += heads
    }
  }

  const events = resolveEvents(wedding, input.payload?.daySchedules, includeFinancials)

  const spendByEvent = new Map<string, number>()
  for (const booking of bookings) {
    const prev = spendByEvent.get(booking.eventId) ?? 0
    spendByEvent.set(booking.eventId, prev + (Number(booking.price) || 0))
  }

  const budgetByEvent = includeFinancials
    ? events
        .filter((e) => typeof e.budgetTarget === "number")
        .map((e) => ({
          eventName: e.name,
          targetPkr: e.budgetTarget ?? 0,
          bookedSpendPkr: spendByEvent.get(String(e.id)) ?? 0,
        }))
    : []

  const firstDate =
    wedding.firstEventDate ||
    events.map((e) => e.date).sort()[0] ||
    ""

  return {
    weddingName: wedding.name || "Wedding plan",
    couple: wedding.couple || wedding.name || "Our wedding",
    organiserName: wedding.organiserName || input.exportedByName || "Family",
    firstEventDate: firstDate,
    plannedEventLabels: plannedEventLabels(wedding.planningPreferences),
    exportedAtIso: new Date().toISOString(),
    exportedByName: input.exportedByName || wedding.organiserName || "Family",
    includeFinancials,
    events,
    guestStats: {
      households: guests.length,
      headcount,
      confirmed,
      declined,
      pending,
    },
    guests: guests
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g) => ({
        name: g.name,
        events: (g.events ?? []).map((id) => eventName(id)).join(", "),
        rsvpSummary: formatRsvpSummary(g),
        partySize: guestPartySize(g),
        kind: g.kind === "group" ? "group" : "individual",
      })),
    bookings: bookings
      .slice()
      .sort((a, b) => String(a.eventDate ?? "").localeCompare(String(b.eventDate ?? "")))
      .map((b) => ({
        vendorName: b.vendorName || "Vendor",
        service: b.packageName || eventName(b.eventId),
        eventName: eventName(b.eventId),
        eventDate: b.eventDate || "—",
        status: b.status,
        ...(includeFinancials ? { amountPkr: Number(b.price) || 0 } : {}),
      })),
    tasks: tasks
      .slice()
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .map((t) => ({
        title: t.title,
        assignee: t.assignee || "Unassigned",
        dueDate: t.dueDate,
        status: t.status,
        eventName: t.eventId ? eventName(t.eventId) : undefined,
        priority: t.priority,
      })),
    budgetByEvent,
    budgetTierLabel: budgetTierLabel(wedding.planningPreferences),
  }
}

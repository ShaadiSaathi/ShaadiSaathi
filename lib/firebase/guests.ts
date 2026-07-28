import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { EventId, Guest, RsvpSource, RsvpStatus } from "@/lib/mockData"
import { getFirestoreDb } from "./config"
import type { FirestoreGuest } from "./types"

function toGuest(docId: string, data: FirestoreGuest): Guest & { weddingId?: string } {
  return {
    id: data.id || docId,
    name: data.name,
    phone: data.phone,
    events: data.events,
    rsvp: data.rsvp,
    rsvpSource: data.rsvpSource,
    rsvpUpdatedAt: data.rsvpUpdatedAt,
    rsvpOrganiserAlert: data.rsvpOrganiserAlert,
    inviteToken: data.inviteToken || docId,
    notes: data.notes,
    weddingId: data.weddingId,
    ...(data.kind ? { kind: data.kind } : {}),
    ...(typeof data.partySize === "number" ? { partySize: data.partySize } : {}),
  }
}

export function subscribeGuestsByWedding(
  weddingId: string,
  onData: (guests: Guest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(getFirestoreDb(), "guests"), where("weddingId", "==", weddingId))
  return onSnapshot(
    q,
    (snap) => {
      const guests = snap.docs.map((d) => toGuest(d.id, d.data() as FirestoreGuest))
      guests.sort((a, b) => a.name.localeCompare(b.name))
      onData(guests)
    },
    (err) => onError?.(err)
  )
}

export async function getGuestByInviteToken(token: string): Promise<Guest | null> {
  const snap = await getDoc(doc(getFirestoreDb(), "guests", token))
  if (!snap.exists()) return null
  return toGuest(snap.id, snap.data() as FirestoreGuest)
}

export function subscribeGuestByToken(
  token: string,
  onData: (guest: Guest | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(getFirestoreDb(), "guests", token),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(toGuest(snap.id, snap.data() as FirestoreGuest))
    },
    (err) => onError?.(err)
  )
}

export async function addGuestToFirestore(
  weddingId: string,
  input: {
    name: string
    phone?: string
    events: EventId[]
    inviteToken: string
    id: string
    kind?: "individual" | "group"
    partySize?: number
  }
): Promise<void> {
  const rsvp = Object.fromEntries(
    input.events.map((e) => [e, "pending" as RsvpStatus])
  ) as Record<EventId, RsvpStatus | null>
  const rsvpSource = Object.fromEntries(
    input.events.map((e) => [e, "organiser" as RsvpSource])
  ) as Record<EventId, RsvpSource | null>
  const rsvpUpdatedAt = Object.fromEntries(
    input.events.map((e) => [e, null])
  ) as Record<EventId, number | null>
  const rsvpOrganiserAlert = Object.fromEntries(
    input.events.map((e) => [e, false])
  ) as Record<EventId, boolean>

  const guest: FirestoreGuest = {
    id: input.id,
    weddingId,
    name: input.name.trim(),
    phone: input.phone ?? "+92 3XX ••• ••00",
    events: input.events,
    rsvp,
    rsvpSource,
    rsvpUpdatedAt,
    rsvpOrganiserAlert,
    inviteToken: input.inviteToken,
    updatedAt: Date.now(),
    ...(input.kind === "group"
      ? {
          kind: "group" as const,
          partySize: Math.max(2, Math.floor(input.partySize ?? 2)),
        }
      : {}),
  }

  await setDoc(doc(getFirestoreDb(), "guests", input.inviteToken), guest)
}

const ALL_EVENTS: EventId[] = ["mehndi", "baraat", "walima"]

function normalizeGuestName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Stable public-claim token so we can getDoc without listing the guests collection. */
export function makeWeddingClaimInviteToken(weddingId: string, name: string): string {
  const normalized = normalizeGuestName(name)
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20)
  const key = `${weddingId}:${normalized}`
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const suffix = (hash >>> 0).toString(36)
  return `${slug || "guest"}-w${suffix}`
}

/**
 * Public wedding-invite claim: find-or-create a guest by stable token.
 * Uses client Firestore (Admin API is currently broken on Vercel).
 */
export async function claimGuestOnWeddingInvite(input: {
  weddingId: string
  name: string
  phone?: string
}): Promise<{ inviteToken: string; created: boolean; name: string }> {
  const name = input.name.trim()
  if (name.length < 2 || name.length > 80) {
    throw new Error("Please enter your name (at least 2 characters).")
  }

  const inviteToken = makeWeddingClaimInviteToken(input.weddingId, name)
  const existing = await getGuestByInviteToken(inviteToken)
  if (existing) {
    return { inviteToken, created: false, name: existing.name }
  }

  const id = `guest-${inviteToken}`
  const now = Date.now()
  const rsvp = Object.fromEntries(
    ALL_EVENTS.map((e) => [e, "pending" as RsvpStatus])
  ) as Record<EventId, RsvpStatus | null>
  const rsvpSource = Object.fromEntries(
    ALL_EVENTS.map((e) => [e, "organiser" as RsvpSource])
  ) as Record<EventId, RsvpSource | null>
  const rsvpUpdatedAt = Object.fromEntries(
    ALL_EVENTS.map((e) => [e, null])
  ) as Record<EventId, number | null>
  const rsvpOrganiserAlert = Object.fromEntries(
    ALL_EVENTS.map((e) => [e, false])
  ) as Record<EventId, boolean>

  const guest: FirestoreGuest = {
    id,
    weddingId: input.weddingId,
    name,
    phone: input.phone?.trim() || "+92 3XX ••• ••00",
    events: ALL_EVENTS,
    rsvp,
    rsvpSource,
    rsvpUpdatedAt,
    rsvpOrganiserAlert,
    inviteToken,
    notes: "Joined via wedding invite link",
    updatedAt: now,
  }

  await setDoc(doc(getFirestoreDb(), "guests", inviteToken), guest)
  return { inviteToken, created: true, name }
}

export async function updateGuestRsvpByOrganiser(
  inviteToken: string,
  eventId: EventId,
  status: RsvpStatus
): Promise<void> {
  const now = Date.now()
  await updateDoc(doc(getFirestoreDb(), "guests", inviteToken), {
    [`rsvp.${eventId}`]: status,
    [`rsvpSource.${eventId}`]: "organiser" as RsvpSource,
    [`rsvpUpdatedAt.${eventId}`]: now,
    [`rsvpOrganiserAlert.${eventId}`]: false,
    updatedAt: now,
  })
}

function isRespondedStatus(status: unknown): status is "confirmed" | "declined" {
  return status === "confirmed" || status === "declined"
}

export async function updateGuestRsvpByGuest(
  inviteToken: string,
  eventId: EventId,
  status: Exclude<RsvpStatus, "cancelled" | "pending">
): Promise<void> {
  const ref = doc(getFirestoreDb(), "guests", inviteToken)
  const snap = await getDoc(ref)
  const prev = snap.exists()
    ? (snap.data() as FirestoreGuest).rsvp?.[eventId]
    : null
  const now = Date.now()
  const isChange = isRespondedStatus(prev) && prev !== status

  await updateDoc(ref, {
    [`rsvp.${eventId}`]: status,
    [`rsvpSource.${eventId}`]: "guest" as RsvpSource,
    [`rsvpUpdatedAt.${eventId}`]: now,
    updatedAt: now,
    ...(isChange ? { [`rsvpOrganiserAlert.${eventId}`]: true } : {}),
  })
}

/** Bulk RSVP for every invited event on the guest's invite page. */
export async function updateGuestRsvpBulkByGuest(
  inviteToken: string,
  status: Exclude<RsvpStatus, "cancelled" | "pending">,
  eventIds: EventId[]
): Promise<void> {
  const ref = doc(getFirestoreDb(), "guests", inviteToken)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? (snap.data() as FirestoreGuest) : null
  const now = Date.now()

  const patch: Record<string, string | number | boolean> = {
    updatedAt: now,
  }

  for (const eventId of eventIds) {
    const prev = existing?.rsvp?.[eventId]
    const isChange = isRespondedStatus(prev) && prev !== status
    patch[`rsvp.${eventId}`] = status
    patch[`rsvpSource.${eventId}`] = "guest"
    patch[`rsvpUpdatedAt.${eventId}`] = now
    if (isChange) {
      patch[`rsvpOrganiserAlert.${eventId}`] = true
    }
  }

  await updateDoc(ref, patch)
}

/** Clear organiser "Updated" cues after they've been seen. */
export async function clearGuestRsvpOrganiserAlerts(
  inviteToken: string,
  eventIds: EventId[]
): Promise<void> {
  if (eventIds.length === 0) return
  const patch: Record<string, boolean | number> = {
    updatedAt: Date.now(),
  }
  for (const eventId of eventIds) {
    patch[`rsvpOrganiserAlert.${eventId}`] = false
  }
  await updateDoc(doc(getFirestoreDb(), "guests", inviteToken), patch)
}

export async function seedGuestsBatch(
  weddingId: string,
  guests: Guest[]
): Promise<void> {
  const db = getFirestoreDb()
  await Promise.all(
    guests.map((g) =>
      setDoc(doc(db, "guests", g.inviteToken), {
        id: g.id,
        weddingId,
        name: g.name,
        phone: g.phone,
        events: g.events,
        rsvp: g.rsvp,
        rsvpSource: g.rsvpSource,
        rsvpUpdatedAt: g.rsvpUpdatedAt ?? {
          mehndi: null,
          baraat: null,
          walima: null,
        },
        rsvpOrganiserAlert: g.rsvpOrganiserAlert ?? {
          mehndi: false,
          baraat: false,
          walima: false,
        },
        inviteToken: g.inviteToken,
        notes: g.notes,
        updatedAt: Date.now(),
      } satisfies FirestoreGuest)
    )
  )
}

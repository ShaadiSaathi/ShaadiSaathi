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
import { isGuestInviteToken, makeGuestInviteToken } from "@/lib/guest-invite-token"
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
    phone: input.phone ?? (input.kind === "group" ? "" : "+92 3XX ••• ••00"),
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

  if (!isGuestInviteToken(input.inviteToken)) {
    throw new Error("Guest invite token must be a random UUID.")
  }

  const ref = doc(getFirestoreDb(), "guests", input.inviteToken)
  await setDoc(ref, guest)
}

const ALL_EVENTS: EventId[] = ["mehndi", "baraat", "walima"]

/**
 * Public wedding-invite claim: find-or-create via Admin API (name match).
 * Falls back to a client create with a random token if the API is unconfigured.
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

  const res = await fetch(
    `/api/invite/wedding/${encodeURIComponent(input.weddingId)}/claim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: input.phone?.trim() || "" }),
    }
  )

  if (res.ok) {
    const payload = (await res.json()) as {
      inviteToken?: unknown
      created?: unknown
      name?: unknown
    }
    if (typeof payload.inviteToken !== "string" || !payload.inviteToken.trim()) {
      throw new Error("Invite claiming returned an invalid token. Please try again.")
    }
    return {
      inviteToken: payload.inviteToken,
      created: payload.created === true,
      name: typeof payload.name === "string" ? payload.name : name,
    }
  }

  if (res.status !== 503) {
    const payload = (await res.json().catch(() => null)) as { error?: unknown } | null
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Could not open your invitation. Please try again."
    )
  }

  return createPublicClaimGuestFallback({
    weddingId: input.weddingId,
    name,
    phone: input.phone,
  })
}

async function createPublicClaimGuestFallback(input: {
  weddingId: string
  name: string
  phone?: string
}): Promise<{ inviteToken: string; created: boolean; name: string }> {
  const inviteToken = makeGuestInviteToken()
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
    id: `guest-${inviteToken}`,
    weddingId: input.weddingId,
    name: input.name,
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
  return { inviteToken, created: true, name: input.name }
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
    guests.map((g) => {
      const inviteToken = isGuestInviteToken(g.inviteToken)
        ? g.inviteToken
        : makeGuestInviteToken()
      return setDoc(doc(db, "guests", inviteToken), {
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
        inviteToken,
        notes: g.notes,
        updatedAt: Date.now(),
      } satisfies FirestoreGuest)
    })
  )
}

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

function toGuest(docId: string, data: FirestoreGuest): Guest {
  return {
    id: data.id || docId,
    name: data.name,
    phone: data.phone,
    events: data.events,
    rsvp: data.rsvp,
    rsvpSource: data.rsvpSource,
    inviteToken: data.inviteToken || docId,
    notes: data.notes,
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
  input: { name: string; phone?: string; events: EventId[]; inviteToken: string; id: string }
): Promise<void> {
  const rsvp = Object.fromEntries(
    input.events.map((e) => [e, "pending" as RsvpStatus])
  ) as Record<EventId, RsvpStatus | null>
  const rsvpSource = Object.fromEntries(
    input.events.map((e) => [e, "organiser" as RsvpSource])
  ) as Record<EventId, RsvpSource | null>

  const guest: FirestoreGuest = {
    id: input.id,
    weddingId,
    name: input.name.trim(),
    phone: input.phone ?? "+92 3XX ••• ••00",
    events: input.events,
    rsvp,
    rsvpSource,
    inviteToken: input.inviteToken,
    updatedAt: Date.now(),
  }

  await setDoc(doc(getFirestoreDb(), "guests", input.inviteToken), guest)
}

export async function updateGuestRsvpByOrganiser(
  inviteToken: string,
  eventId: EventId,
  status: RsvpStatus
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "guests", inviteToken), {
    [`rsvp.${eventId}`]: status,
    [`rsvpSource.${eventId}`]: "organiser" as RsvpSource,
    updatedAt: Date.now(),
  })
}

export async function updateGuestRsvpByGuest(
  inviteToken: string,
  eventId: EventId,
  status: Exclude<RsvpStatus, "cancelled" | "pending">
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "guests", inviteToken), {
    [`rsvp.${eventId}`]: status,
    [`rsvpSource.${eventId}`]: "guest" as RsvpSource,
    updatedAt: Date.now(),
  })
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
        inviteToken: g.inviteToken,
        notes: g.notes,
        updatedAt: Date.now(),
      } satisfies FirestoreGuest)
    )
  )
}

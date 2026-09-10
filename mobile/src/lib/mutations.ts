import {
  addDoc,
  collection,
  deleteField,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { apiJson } from "@/src/lib/auth-fetch"
import { getFirestoreDb } from "@/src/lib/firebase"
import type { EventId, RsvpStatus } from "@/src/lib/types"

export function makeGuestInviteToken(): string {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.randomUUID) {
    throw new Error("Secure random token generation is not available.")
  }
  return cryptoObj.randomUUID()
}

const DEFAULT_EVENTS: EventId[] = ["mehndi", "baraat", "walima"]

export async function addGuest(input: {
  weddingId: string
  name: string
  phone?: string
  events?: EventId[]
}): Promise<string> {
  const events = input.events?.length ? input.events : DEFAULT_EVENTS
  const inviteToken = makeGuestInviteToken()
  const rsvp = Object.fromEntries(
    events.map((e) => [e, "pending" as RsvpStatus])
  )
  const rsvpSource = Object.fromEntries(events.map((e) => [e, "organiser"]))
  await setDoc(doc(getFirestoreDb(), "guests", inviteToken), {
    id: inviteToken,
    weddingId: input.weddingId,
    name: input.name.trim(),
    phone: input.phone?.trim() || "",
    events,
    rsvp,
    rsvpSource,
    inviteToken,
    updatedAt: Date.now(),
  })
  return inviteToken
}

export async function setGuestRsvp(
  inviteToken: string,
  eventId: EventId,
  status: RsvpStatus
): Promise<void> {
  const now = Date.now()
  await updateDoc(doc(getFirestoreDb(), "guests", inviteToken), {
    [`rsvp.${eventId}`]: status,
    [`rsvpSource.${eventId}`]: "organiser",
    [`rsvpUpdatedAt.${eventId}`]: now,
    [`rsvpOrganiserAlert.${eventId}`]: false,
    updatedAt: now,
  })
}

export async function addTask(input: {
  weddingId: string
  title: string
  assignee?: string
  dueDate?: string
  eventId?: EventId
}): Promise<string> {
  const ref = doc(collection(getFirestoreDb(), "tasks"))
  await setDoc(ref, {
    id: ref.id,
    weddingId: input.weddingId,
    title: input.title.trim(),
    assignee: (input.assignee ?? "").trim(),
    dueDate: input.dueDate || new Date().toISOString().slice(0, 10),
    status: "todo",
    priority: "medium",
    createdAt: Date.now(),
    ...(input.eventId ? { eventId: input.eventId } : {}),
  })
  return ref.id
}

export async function setTaskStatus(
  taskId: string,
  status: "todo" | "in_progress" | "done"
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "tasks", taskId), { status })
}

export async function createBooking(input: {
  weddingId: string
  vendorId: string
  eventId: EventId
  price: number
  packageName?: string
  note?: string
  familyName?: string
  weddingName?: string
  vendorName?: string
}): Promise<{ bookingId: string }> {
  const data = await apiJson<{ bookingId: string }>("/api/bookings/create", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      paymentPath: "in_person",
      status: "requested",
    }),
  })
  return { bookingId: data.bookingId }
}

export async function confirmBooking(bookingId: string): Promise<void> {
  await apiJson(`/api/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function updateBookingStatus(
  bookingId: string,
  status: string
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    status,
    updatedAt: Date.now(),
  })
}

export async function setCounterOffer(
  bookingId: string,
  price: number,
  note?: string
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    counterOffer: {
      price,
      note: note || "",
      proposedAt: Date.now(),
      proposedBy: "vendor",
    },
    status: "countered",
    updatedAt: Date.now(),
  })
}

export async function acceptCounterOffer(bookingId: string): Promise<void> {
  await confirmBooking(bookingId)
}

export async function clearCounterOffer(bookingId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    counterOffer: deleteField(),
    updatedAt: Date.now(),
  })
}

export async function checkInBooking(bookingId: string): Promise<void> {
  await apiJson(`/api/bookings/${encodeURIComponent(bookingId)}/check-in`, {
    method: "POST",
    body: JSON.stringify({
      checkInPhoto: {
        name: "mobile-checkin.jpg",
        uploadedAt: Date.now(),
      },
    }),
  })
}

export async function completeBooking(bookingId: string): Promise<void> {
  await apiJson(`/api/bookings/${encodeURIComponent(bookingId)}/complete`, {
    method: "POST",
  })
}

export async function sendBookingMessage(input: {
  bookingId: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  text: string
}): Promise<void> {
  const text = input.text.trim()
  if (!text) throw new Error("Message cannot be empty")
  await addDoc(collection(getFirestoreDb(), "messages"), {
    bookingId: input.bookingId,
    senderId: input.senderId,
    senderType: input.senderType,
    senderName: input.senderName?.trim() || "",
    text,
    timestamp: Date.now(),
  })
}

export async function inviteCollaborator(input: {
  weddingId: string
  phone: string
  invitedByName: string
}): Promise<void> {
  await apiJson("/api/collaborators/invite", {
    method: "POST",
    body: JSON.stringify({
      weddingId: input.weddingId,
      phone: input.phone,
      role: "full",
      invitedByName: input.invitedByName,
    }),
  })
}

import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { EventId } from "@/lib/mockData"
import type { VendorBooking, BookingStatus } from "@/lib/mockVendors"
import { createInitialPayment, type PaymentPath } from "@/lib/mockPayments"
import { getFirestoreDb } from "./config"
import type {
  FirestoreBooking,
  FirestoreBookingCounterOffer,
  FirestoreBookingDispute,
  FirestoreExtraWorkRequest,
} from "./types"

function toVendorBooking(data: FirestoreBooking): VendorBooking {
  return {
    id: data.id,
    vendorId: data.vendorId,
    eventId: data.eventId,
    status: data.status,
    ...(data.eventDate ? { eventDate: data.eventDate } : {}),
    price: data.price,
    packageName: data.packageName,
    guestCount: data.guestCount,
    note: data.note,
    createdAt: new Date(data.createdAt).toISOString(),
    payment: createInitialPayment(data.price, data.paymentPath),
    ...(data.counterOffer
      ? {
          counterOffer: {
            price: data.counterOffer.price,
            packageName: data.counterOffer.packageName,
            note: data.counterOffer.note,
            proposedAt: new Date(data.counterOffer.proposedAt).toISOString().slice(0, 10),
            proposedBy: data.counterOffer.proposedBy,
          },
        }
      : {}),
  }
}

export function subscribeBookingsByWedding(
  weddingId: string,
  onData: (bookings: VendorBooking[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(getFirestoreDb(), "bookings"), where("weddingId", "==", weddingId))
  return onSnapshot(
    q,
    (snap) => {
      const bookings = snap.docs.map((d) =>
        toVendorBooking({ id: d.id, ...d.data() } as FirestoreBooking)
      )
      onData(bookings)
    },
    (err) => onError?.(err)
  )
}

export function subscribeBookingsByVendor(
  vendorId: string,
  onData: (bookings: FirestoreBooking[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(getFirestoreDb(), "bookings"), where("vendorId", "==", vendorId))
  return onSnapshot(
    q,
    (snap) => {
      const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreBooking)
      onData(bookings)
    },
    (err) => onError?.(err)
  )
}

export async function getBooking(bookingId: string): Promise<FirestoreBooking | null> {
  const snap = await (await import("firebase/firestore")).getDoc(
    doc(getFirestoreDb(), "bookings", bookingId)
  )
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreBooking
}

export async function createBookingInFirestore(
  booking: Omit<FirestoreBooking, "createdAt">
): Promise<void> {
  await setDoc(doc(getFirestoreDb(), "bookings", booking.id), {
    ...booking,
    createdAt: Date.now(),
  })
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    status,
    updatedAt: Date.now(),
  })
}

export async function updateBookingFields(
  bookingId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    ...fields,
    updatedAt: Date.now(),
  })
}

export async function setBookingCounterOffer(
  bookingId: string,
  counterOffer: FirestoreBookingCounterOffer,
  status?: BookingStatus
): Promise<void> {
  await updateBookingFields(bookingId, {
    counterOffer,
    ...(status ? { status } : {}),
  })
}

export async function setBookingDispute(
  bookingId: string,
  dispute: FirestoreBookingDispute
): Promise<void> {
  await updateBookingFields(bookingId, {
    status: "disputed",
    dispute,
  })
}

export async function clearBookingCounterOffer(
  bookingId: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    ...extra,
    counterOffer: deleteField(),
    updatedAt: Date.now(),
  })
}

export async function setBookingExtraWorkRequest(
  bookingId: string,
  extraWorkRequest: FirestoreExtraWorkRequest
): Promise<void> {
  await updateBookingFields(bookingId, { extraWorkRequest })
}

export async function markBookingRead(
  bookingId: string,
  role: "family" | "vendor"
): Promise<void> {
  const field = role === "family" ? "lastReadByFamily" : "lastReadByVendor"
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    [field]: Date.now(),
  })
}

export async function seedBookingsBatch(
  weddingId: string,
  bookings: Array<{
    id: string
    vendorId: string
    eventId: EventId
    status: BookingStatus
    price: number
    packageName?: string
    guestCount?: number
    paymentPath: PaymentPath
    familyName: string
    weddingName: string
    vendorName: string
  }>
): Promise<void> {
  const db = getFirestoreDb()
  await Promise.all(
    bookings.map((b) =>
      setDoc(doc(db, "bookings", b.id), {
        ...b,
        weddingId,
        createdAt: Date.now(),
      } satisfies FirestoreBooking)
    )
  )
}

import {
  collection,
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
import type { FirestoreBooking } from "./types"

function toVendorBooking(data: FirestoreBooking): VendorBooking {
  return {
    id: data.id,
    vendorId: data.vendorId,
    eventId: data.eventId,
    status: data.status,
    price: data.price,
    packageName: data.packageName,
    guestCount: data.guestCount,
    note: data.note,
    createdAt: new Date(data.createdAt).toISOString(),
    payment: createInitialPayment(data.price, data.paymentPath),
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
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), { status })
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

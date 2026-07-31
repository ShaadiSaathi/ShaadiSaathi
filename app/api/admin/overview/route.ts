export const runtime = "nodejs"

import type { FirestoreBooking } from "@/lib/firebase/types"
import {
  adminErrorResponse,
  verifyAdminRequest,
} from "@/lib/server/admin-auth"
import { getAdminDb } from "@/lib/server/firebase-admin"
import { maskPhone } from "@/lib/server/verification-log"

const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "completed",
  "disputed",
  "declined",
  "no_show",
] as const

type BookingStatusKey = (typeof BOOKING_STATUSES)[number]

function countBookingsByStatus(bookings: FirestoreBooking[]) {
  const counts: Record<BookingStatusKey, number> = {
    requested: 0,
    confirmed: 0,
    completed: 0,
    disputed: 0,
    declined: 0,
    no_show: 0,
  }
  let other = 0

  for (const booking of bookings) {
    const status = booking.status
    if ((BOOKING_STATUSES as readonly string[]).includes(status)) {
      counts[status as BookingStatusKey] += 1
    } else {
      other += 1
    }
  }

  return {
    ...counts,
    other,
    total: bookings.length,
  }
}

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request)
    const db = getAdminDb()

    const [weddingsSnap, guestsSnap, bookingsSnap, errorsSnap, successSnap] =
      await Promise.all([
        db.collection("weddings").get(),
        db.collection("guests").get(),
        db.collection("bookings").get(),
        db
          .collection("verification_errors")
          .orderBy("timestamp", "desc")
          .limit(10)
          .get(),
        db
          .collection("verification_success")
          .orderBy("timestamp", "desc")
          .limit(10)
          .get(),
      ])

    const bookings = bookingsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FirestoreBooking
    )

    const recentWeddings = weddingsSnap.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: String(data.name ?? ""),
          couple: String(data.couple ?? ""),
          organiserPhone: maskPhone(String(data.organiserPhone ?? "")),
          createdAt: Number(data.createdAt ?? 0),
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)

    const recentErrors = errorsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        flow: String(data.flow ?? ""),
        phone: String(data.phone ?? ""),
        rawCode: String(data.rawCode ?? ""),
        code: String(data.code ?? ""),
        stage: String(data.stage ?? ""),
        timestamp: Number(data.timestamp ?? 0),
      }
    })

    const recentSuccesses = successSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        flow: String(data.flow ?? ""),
        phone: String(data.phone ?? ""),
        channel: String(data.channel ?? ""),
        stage: String(data.stage ?? ""),
        timestamp: Number(data.timestamp ?? 0),
      }
    })

    return Response.json(
      {
        stats: {
          weddings: weddingsSnap.size,
          guests: guestsSnap.size,
          bookings: countBookingsByStatus(bookings),
        },
        recentWeddings,
        recentErrors,
        recentSuccesses,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    return adminErrorResponse(err)
  }
}

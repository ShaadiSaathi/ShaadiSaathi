export const runtime = "nodejs"

import type { FirestoreBooking, FirestoreMessage } from "@/lib/firebase/types"
import {
  adminErrorResponse,
  verifyAdminRequest,
} from "@/lib/server/admin-auth"
import { getAdminDb } from "@/lib/server/firebase-admin"

function isOpenDispute(booking: FirestoreBooking): boolean {
  if (booking.status === "disputed") return true
  return booking.dispute?.status === "under_review"
}

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request)
    const db = getAdminDb()

    const bookingsSnap = await db.collection("bookings").get()
    const disputed = bookingsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreBooking)
      .filter(isOpenDispute)

    const disputes = await Promise.all(
      disputed.map(async (booking) => {
        const messagesSnap = await db
          .collection("messages")
          .where("bookingId", "==", booking.id)
          .get()

        const messages = messagesSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreMessage)
          .sort((a, b) => a.timestamp - b.timestamp)

        const dispute = booking.dispute
        const disputedAmount =
          dispute?.disputedAmount ?? dispute?.splitFamilyAmount ?? null

        return {
          id: booking.id,
          weddingId: booking.weddingId,
          weddingName: booking.weddingName,
          familyName: booking.familyName,
          vendorId: booking.vendorId,
          vendorName: booking.vendorName,
          agreedAmount: booking.price,
          disputedAmount,
          status: booking.status,
          dispute: {
            status: dispute?.status ?? "under_review",
            category: dispute?.category,
            description: dispute?.description ?? "",
            familyReason: dispute?.familyReason ?? dispute?.description ?? "",
            vendorResponse: dispute?.vendorResponse ?? "",
            evidenceFileName: dispute?.evidenceFileName,
            submittedAt: dispute?.submittedAt ?? booking.createdAt,
            resolution: dispute?.resolution,
          },
          messages: messages.map((message) => ({
            id: message.id,
            senderType: message.senderType,
            text: message.text,
            timestamp: message.timestamp,
          })),
        }
      })
    )

    disputes.sort(
      (a, b) => b.dispute.submittedAt - a.dispute.submittedAt
    )

    return Response.json(
      { disputes },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    return adminErrorResponse(err)
  }
}

export const runtime = "nodejs"

import { FieldValue } from "firebase-admin/firestore"
import type { FirestoreBooking } from "@/lib/firebase/types"
import {
  adminErrorResponse,
  verifyAdminRequest,
} from "@/lib/server/admin-auth"
import { getAdminDb } from "@/lib/server/firebase-admin"

type ResolveBody = {
  resolution?: "family" | "vendor" | "split"
  splitFamilyAmount?: number
}

function parseResolveBody(raw: unknown): ResolveBody {
  if (typeof raw !== "object" || raw === null) return {}
  const body = raw as Record<string, unknown>
  const resolution =
    body.resolution === "family" ||
    body.resolution === "vendor" ||
    body.resolution === "split"
      ? body.resolution
      : undefined
  const splitFamilyAmount =
    typeof body.splitFamilyAmount === "number" &&
    Number.isFinite(body.splitFamilyAmount)
      ? body.splitFamilyAmount
      : undefined
  return { resolution, splitFamilyAmount }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminRequest(request)
    const { id: bookingId } = await context.params
    const body = parseResolveBody(await request.json().catch(() => ({})))

    if (!body.resolution) {
      return Response.json(
        { ok: false, message: "Choose a resolution" },
        { status: 400 }
      )
    }

    if (
      body.resolution === "split" &&
      (body.splitFamilyAmount == null || body.splitFamilyAmount < 0)
    ) {
      return Response.json(
        { ok: false, message: "Enter a valid split amount for the family" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const ref = db.collection("bookings").doc(bookingId)
    const snap = await ref.get()
    if (!snap.exists) {
      return Response.json(
        { ok: false, message: "Booking not found" },
        { status: 404 }
      )
    }

    const booking = { id: snap.id, ...snap.data() } as FirestoreBooking
    const open =
      booking.status === "disputed" ||
      booking.dispute?.status === "under_review"
    if (!open) {
      return Response.json(
        { ok: false, message: "This booking is not under dispute" },
        { status: 400 }
      )
    }

    const agreedAmount = booking.price
    const splitFamilyAmount =
      body.resolution === "split" ? body.splitFamilyAmount! : undefined
    const splitVendorAmount =
      splitFamilyAmount != null
        ? Math.max(0, agreedAmount - splitFamilyAmount)
        : undefined

    await ref.update({
      status: "completed",
      dispute: {
        ...(booking.dispute ?? {
          description: "",
          submittedAt: Date.now(),
        }),
        status: "resolved",
        resolution: body.resolution,
        splitFamilyAmount,
        splitVendorAmount,
        resolvedAt: Date.now(),
        resolvedByUid: admin.uid,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return adminErrorResponse(err)
  }
}

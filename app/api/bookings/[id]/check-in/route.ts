/**
 * Vendor or family check-in — persists payment.checkInAt and releases deposit via Admin SDK.
 */

import { NextResponse } from "next/server"
import {
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { applyVendorCheckIn } from "@/lib/server/booking-vendor-actions"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

type Body = {
  checkInPhoto?: {
    name?: string
    uploadedAt?: number | string
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Booking service is not configured on this server." },
      { status: 503 }
    )
  }

  let uid: string
  try {
    ;({ uid } = await verifyPaymentUser(request))
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: bookingId } = await context.params
  if (!bookingId?.trim()) {
    return NextResponse.json({ error: "Missing booking id." }, { status: 400 })
  }

  let body: Body = {}
  try {
    const raw = await request.json().catch(() => ({}))
    if (typeof raw === "object" && raw !== null) body = raw as Body
  } catch {
    body = {}
  }

  const name =
    typeof body.checkInPhoto?.name === "string" && body.checkInPhoto.name.trim()
      ? body.checkInPhoto.name.trim()
      : "check-in-photo"

  let uploadedAt = Date.now()
  const rawUploadedAt = body.checkInPhoto?.uploadedAt
  if (typeof rawUploadedAt === "number" && Number.isFinite(rawUploadedAt)) {
    uploadedAt = rawUploadedAt
  } else if (typeof rawUploadedAt === "string") {
    const parsed = Date.parse(rawUploadedAt)
    if (Number.isFinite(parsed)) uploadedAt = parsed
  }

  try {
    const result = await applyVendorCheckIn({
      bookingId,
      uid,
      checkInPhoto: { name, uploadedAt },
    })
    return NextResponse.json({
      ok: true,
      bookingId,
      checkInAt: result.checkInAt,
      alreadyCheckedIn: result.alreadyCheckedIn,
    })
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[api/bookings/check-in]", err)
    return NextResponse.json(
      { error: "Could not record check-in. Please try again." },
      { status: 500 }
    )
  }
}

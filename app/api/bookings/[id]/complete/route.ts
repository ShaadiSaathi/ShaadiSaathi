/**
 * Vendor marks a confirmed booking as completed and updates earnings fields.
 */

import { NextResponse } from "next/server"
import {
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { applyVendorComplete } from "@/lib/server/booking-vendor-actions"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

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

  try {
    const result = await applyVendorComplete({ bookingId, uid })
    return NextResponse.json({
      ok: true,
      bookingId,
      status: "completed" as const,
      alreadyCompleted: result.alreadyCompleted,
    })
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[api/bookings/complete]", err)
    return NextResponse.json(
      { error: "Could not mark booking completed. Please try again." },
      { status: 500 }
    )
  }
}

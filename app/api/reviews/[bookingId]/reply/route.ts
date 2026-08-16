import { NextResponse } from "next/server"
import {
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  replyToVendorReviewAsOwner,
  VendorReviewError,
} from "@/lib/server/vendor-reviews"

export const runtime = "nodejs"

/** Vendor posts a single public reply on a review for their listing. */
export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Review service is not configured on this server." },
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

  const { bookingId: rawId } = await context.params
  const bookingId = rawId?.trim() ?? ""
  if (!bookingId) {
    return NextResponse.json({ error: "Missing review id." }, { status: 400 })
  }

  let reply: string
  try {
    const body = (await request.json()) as { reply?: unknown }
    reply = typeof body.reply === "string" ? body.reply : ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  try {
    const review = await replyToVendorReviewAsOwner({
      uid,
      bookingId,
      reply,
    })
    return NextResponse.json({ ok: true, review })
  } catch (err) {
    if (err instanceof VendorReviewError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("review reply failed", err)
    return NextResponse.json(
      { error: "Could not save your reply. Please try again." },
      { status: 500 }
    )
  }
}

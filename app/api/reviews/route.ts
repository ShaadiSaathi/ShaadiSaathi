import { NextResponse } from "next/server"
import {
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  upsertVendorReviewForMember,
  VendorReviewError,
} from "@/lib/server/vendor-reviews"

export const runtime = "nodejs"

interface ReviewBody {
  bookingId?: string
  rating?: number
  comment?: string
}

function parseBody(raw: unknown): ReviewBody {
  if (typeof raw !== "object" || raw === null) return {}
  return raw as ReviewBody
}

/** Family upserts a review for a past/completed booking (one per booking). */
export async function POST(request: Request) {
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

  let body: ReviewBody
  try {
    body = parseBody(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  try {
    const review = await upsertVendorReviewForMember({
      uid,
      bookingId: body.bookingId?.trim() ?? "",
      rating: body.rating as number,
      comment: body.comment,
    })
    return NextResponse.json({ ok: true, review })
  } catch (err) {
    if (err instanceof VendorReviewError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("review upsert failed", err)
    return NextResponse.json(
      { error: "Could not save your review. Please try again." },
      { status: 500 }
    )
  }
}

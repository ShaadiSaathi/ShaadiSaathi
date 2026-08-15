/**
 * Server-validated vendor portfolio save.
 * Client uploads images to Storage first, then posts metadata here.
 */

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import {
  photoUrlsFromPortfolio,
  validatePortfolioItems,
} from "@/lib/firebase/vendor-portfolio"
import {
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/payment-auth"
import {
  getAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

type Body = {
  vendorId?: string
  items?: unknown
}

export async function PUT(request: Request) {
  try {
    const user = await verifyPaymentUser(request)
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const body = (await request.json()) as Body
    const vendorId =
      typeof body.vendorId === "string" ? body.vendorId.trim() : ""
    if (!vendorId) {
      return NextResponse.json({ message: "Missing vendor id" }, { status: 400 })
    }

    const checked = validatePortfolioItems(body.items)
    if (!checked.ok) {
      return NextResponse.json({ message: checked.message }, { status: 400 })
    }

    const ref = getAdminDb().collection("vendors").doc(vendorId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 })
    }
    const data = snap.data() ?? {}
    if (data.ownerUid !== user.uid) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 })
    }

    const photoUrls = photoUrlsFromPortfolio(checked.items)
    await ref.update({
      portfolioItems: checked.items,
      photoUrls,
      coverPhotoUrl: photoUrls[0] ?? FieldValue.delete(),
    })

    return NextResponse.json({
      ok: true,
      items: checked.items,
      photoUrls,
    })
  } catch (error) {
    if (error instanceof PaymentAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error("[api/vendor/portfolio]", error)
    return NextResponse.json(
      { message: "Could not save portfolio" },
      { status: 500 }
    )
  }
}

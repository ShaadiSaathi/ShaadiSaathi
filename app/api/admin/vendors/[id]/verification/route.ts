/**
 * Admin: approve or reject a vendor verification submission.
 */

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/admin-auth"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { normalizeVendorVerificationStatus } from "@/lib/firebase/vendor-verification"

export const runtime = "nodejs"

type Body = {
  action?: "approve" | "reject"
  rejectionReason?: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminRequest(request)
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const { id: vendorId } = await context.params
    if (!vendorId?.trim()) {
      return NextResponse.json({ message: "Missing vendor id" }, { status: 400 })
    }

    const body = (await request.json()) as Body
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json(
        { message: "action must be approve or reject" },
        { status: 400 }
      )
    }

    const vendorRef = getAdminDb().collection("vendors").doc(vendorId.trim())
    const snap = await vendorRef.get()
    if (!snap.exists) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 })
    }

    const data = snap.data() ?? {}
    const current = normalizeVendorVerificationStatus(data.verificationStatus)
    if (current !== "pending") {
      return NextResponse.json(
        {
          message: `Vendor is not pending review (current status: ${current})`,
        },
        { status: 400 }
      )
    }

    const now = Date.now()
    if (body.action === "approve") {
      await vendorRef.update({
        verificationStatus: "verified",
        verificationReviewedAt: now,
        verificationRejectionReason: FieldValue.delete(),
        verifiedByUid: admin.uid,
      })
      return NextResponse.json({ ok: true, verificationStatus: "verified" })
    }

    const reason =
      typeof body.rejectionReason === "string" && body.rejectionReason.trim()
        ? body.rejectionReason.trim().slice(0, 500)
        : "Your verification details could not be approved. Please check your CNIC / ID number and business details, then resubmit."

    await vendorRef.update({
      verificationStatus: "rejected",
      verificationReviewedAt: now,
      verificationRejectionReason: reason,
      verifiedByUid: FieldValue.delete(),
    })

    return NextResponse.json({
      ok: true,
      verificationStatus: "rejected",
      rejectionReason: reason,
    })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error("[admin/vendors/verification/id]", error)
    return NextResponse.json(
      { message: "Could not update vendor verification" },
      { status: 500 }
    )
  }
}

/**
 * Admin: approve or reject a vendor verification submission.
 */

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/admin-auth"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { normalizeVendorVerificationStatus } from "@/lib/firebase/vendor-verification"
import { createNotificationAdmin } from "@/lib/server/notifications"

export const runtime = "nodejs"

/** Sentinel weddingId for platform → vendor notifications (Admin SDK bypasses rules). */
const PLATFORM_NOTIFICATION_WEDDING_ID = "platform"

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

    const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : ""
    const businessName =
      typeof data.businessName === "string" ? data.businessName : "your business"
    const now = Date.now()

    if (body.action === "approve") {
      await vendorRef.update({
        verificationStatus: "verified",
        onboardingStatus: "active",
        verificationReviewedAt: now,
        verificationRejectionReason: FieldValue.delete(),
        verifiedByUid: admin.uid,
      })
      if (ownerUid) {
        await createNotificationAdmin({
          recipientUid: ownerUid,
          weddingId: PLATFORM_NOTIFICATION_WEDDING_ID,
          type: "vendor_verification_approved",
          message: `${businessName} was approved. You’re verified and can receive deposits and payouts.`,
          vendorId: vendorId.trim(),
          href: "/vendor/dashboard",
          actorUid: admin.uid,
          actorName: "Shaadi Saathi",
        })
      }
      return NextResponse.json({ ok: true, verificationStatus: "verified" })
    }

    const reason =
      typeof body.rejectionReason === "string" && body.rejectionReason.trim()
        ? body.rejectionReason.trim().slice(0, 500)
        : "Your verification details could not be approved. Please check your CNIC / ID number and business details, then resubmit."

    await vendorRef.update({
      verificationStatus: "rejected",
      onboardingStatus: "rejected",
      verificationReviewedAt: now,
      verificationRejectionReason: reason,
      verifiedByUid: FieldValue.delete(),
    })
    if (ownerUid) {
      await createNotificationAdmin({
        recipientUid: ownerUid,
        weddingId: PLATFORM_NOTIFICATION_WEDDING_ID,
        type: "vendor_verification_rejected",
        message: reason.slice(0, 500),
        vendorId: vendorId.trim(),
        href: "/vendor/onboarding",
        priority: "urgent",
        actorUid: admin.uid,
        actorName: "Shaadi Saathi",
      })
    }

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

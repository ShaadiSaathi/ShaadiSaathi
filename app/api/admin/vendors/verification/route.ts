/**
 * Admin: list vendors awaiting verification review.
 */

import { NextResponse } from "next/server"
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/admin-auth"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { normalizeVendorVerificationStatus } from "@/lib/firebase/vendor-verification"

export const runtime = "nodejs"

export type AdminPendingVendor = {
  id: string
  businessName: string
  city: string
  phone: string
  ownerUid: string
  verificationStatus: "pending"
  verificationCnic: string
  verificationBusinessName: string
  verificationCity: string
  verificationSubmittedAt: number
  createdAt: number
}

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request)
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const snap = await getAdminDb()
      .collection("vendors")
      .where("verificationStatus", "==", "pending")
      .get()

    const vendors: AdminPendingVendor[] = snap.docs
      .map((docSnap) => {
        const data = docSnap.data()
        const status = normalizeVendorVerificationStatus(data.verificationStatus)
        if (status !== "pending") return null
        return {
          id: docSnap.id,
          businessName:
            typeof data.businessName === "string" ? data.businessName : "—",
          city: typeof data.city === "string" ? data.city : "—",
          phone: typeof data.phone === "string" ? data.phone : "—",
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
          verificationStatus: "pending" as const,
          verificationCnic:
            typeof data.verificationCnic === "string" ? data.verificationCnic : "—",
          verificationBusinessName:
            typeof data.verificationBusinessName === "string"
              ? data.verificationBusinessName
              : typeof data.businessName === "string"
                ? data.businessName
                : "—",
          verificationCity:
            typeof data.verificationCity === "string"
              ? data.verificationCity
              : typeof data.city === "string"
                ? data.city
                : "—",
          verificationSubmittedAt:
            typeof data.verificationSubmittedAt === "number"
              ? data.verificationSubmittedAt
              : 0,
          createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
        }
      })
      .filter((row): row is AdminPendingVendor => row !== null)
      .sort(
        (a, b) =>
          (b.verificationSubmittedAt || b.createdAt) -
          (a.verificationSubmittedAt || a.createdAt)
      )

    return NextResponse.json({ vendors })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error("[admin/vendors/verification]", error)
    return NextResponse.json(
      { message: "Could not load pending vendor verifications" },
      { status: 500 }
    )
  }
}

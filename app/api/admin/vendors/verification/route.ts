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
  categoryId?: string
  bio?: string
  startingPrice?: number
  pricingNotes?: string
  photoUrls?: string[]
  availableFor?: string[]
  email?: string
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

    const db = getAdminDb()
    const rows = await Promise.all(
      snap.docs.map(async (docSnap): Promise<AdminPendingVendor | null> => {
        const data = docSnap.data()
        const status = normalizeVendorVerificationStatus(data.verificationStatus)
        if (status !== "pending") return null
        const kycSnap = await db.collection("vendor_kyc").doc(docSnap.id).get()
        const kyc = kycSnap.data() ?? {}
        const cnic =
          typeof kyc.verificationCnic === "string"
            ? kyc.verificationCnic
            : typeof data.verificationCnic === "string"
              ? data.verificationCnic
              : "—"
        const row: AdminPendingVendor = {
          id: docSnap.id,
          businessName:
            typeof data.businessName === "string" ? data.businessName : "—",
          city: typeof data.city === "string" ? data.city : "—",
          phone: typeof data.phone === "string" ? data.phone : "—",
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
          verificationStatus: "pending",
          verificationCnic: cnic,
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
        if (typeof data.categoryId === "string") row.categoryId = data.categoryId
        if (typeof data.bio === "string") row.bio = data.bio
        if (typeof data.startingPrice === "number") {
          row.startingPrice = data.startingPrice
        }
        if (typeof data.pricingNotes === "string") {
          row.pricingNotes = data.pricingNotes
        }
        if (Array.isArray(data.photoUrls)) {
          row.photoUrls = data.photoUrls.filter(
            (u: unknown): u is string => typeof u === "string"
          )
        }
        if (Array.isArray(data.availableFor)) {
          row.availableFor = data.availableFor.filter(
            (u: unknown): u is string => typeof u === "string"
          )
        }
        if (typeof data.email === "string") row.email = data.email
        return row
      })
    )
    const vendors = rows
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

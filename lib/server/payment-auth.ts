/**
 * Auth helper for payment API routes — any signed-in Firebase user.
 * Financial mutations must also call assertWeddingPaymentOwner (or vendor checks).
 */

import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "./firebase-admin"

export class PaymentAuthError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "PaymentAuthError"
    this.status = status
  }
}

export async function verifyPaymentUser(
  request: Request
): Promise<{ uid: string; email?: string }> {
  if (!isFirebaseAdminConfigured()) {
    throw new PaymentAuthError(503, "Firebase Admin is not configured")
  }

  const header = request.headers.get("authorization") ?? ""
  if (!header.startsWith("Bearer ")) {
    throw new PaymentAuthError(401, "Sign in to continue with payment")
  }

  const idToken = header.slice("Bearer ".length).trim()
  if (!idToken) {
    throw new PaymentAuthError(401, "Sign in to continue with payment")
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
    }
  } catch {
    throw new PaymentAuthError(401, "Invalid session — please sign in again")
  }
}

type WeddingAuthFields = {
  ownerId?: string
  memberUids?: string[]
}

export async function getWeddingAuthFields(
  weddingId: string
): Promise<WeddingAuthFields & { exists: boolean }> {
  const snap = await getAdminDb().collection("weddings").doc(weddingId).get()
  if (!snap.exists) return { exists: false }
  const data = snap.data() as WeddingAuthFields
  return {
    exists: true,
    ownerId: data.ownerId,
    memberUids: data.memberUids,
  }
}

/** Family payment approvals — wedding owner only (not collaborators). */
export async function assertWeddingPaymentOwner(
  weddingId: string,
  uid: string
): Promise<void> {
  const wedding = await getWeddingAuthFields(weddingId)
  if (!wedding.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }
  if (wedding.ownerId !== uid) {
    throw new PaymentAuthError(
      403,
      "Only the wedding owner can approve payments for this wedding"
    )
  }
}

/** Deposit capture / refund: wedding owner or the booking's vendor account. */
export async function assertWeddingOwnerOrVendorOwner(
  weddingId: string,
  vendorId: string | undefined,
  uid: string
): Promise<void> {
  const wedding = await getWeddingAuthFields(weddingId)
  if (!wedding.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }
  if (wedding.ownerId === uid) return

  if (vendorId) {
    const vendorSnap = await getAdminDb().collection("vendors").doc(vendorId).get()
    if (vendorSnap.exists && (vendorSnap.data() as { ownerUid?: string }).ownerUid === uid) {
      return
    }
  }

  throw new PaymentAuthError(
    403,
    "Only the wedding owner or vendor can perform this payment action"
  )
}

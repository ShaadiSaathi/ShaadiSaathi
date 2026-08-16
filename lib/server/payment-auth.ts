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
  paymentApproverUids?: string[]
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
    paymentApproverUids: data.paymentApproverUids,
  }
}

function uidCanApproveWeddingPayments(
  uid: string,
  wedding: WeddingAuthFields
): boolean {
  if (wedding.ownerId === uid) return true
  return (wedding.paymentApproverUids ?? []).includes(uid)
}

/**
 * Family payment / booking / dispute approvals — wedding owner, or a
 * collaborator listed on paymentApproverUids.
 */
export async function assertWeddingPaymentOwner(
  weddingId: string,
  uid: string
): Promise<void> {
  const wedding = await getWeddingAuthFields(weddingId)
  if (!wedding.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }
  if (!uidCanApproveWeddingPayments(uid, wedding)) {
    throw new PaymentAuthError(
      403,
      "Only the wedding owner or an authorized payment approver can do this"
    )
  }
}

/** Deposit capture / refund: payment approver or the booking's vendor account. */
export async function assertWeddingOwnerOrVendorOwner(
  weddingId: string,
  vendorId: string | undefined,
  uid: string
): Promise<void> {
  const wedding = await getWeddingAuthFields(weddingId)
  if (!wedding.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }
  if (uidCanApproveWeddingPayments(uid, wedding)) return

  if (vendorId) {
    const vendorSnap = await getAdminDb().collection("vendors").doc(vendorId).get()
    if (vendorSnap.exists && (vendorSnap.data() as { ownerUid?: string }).ownerUid === uid) {
      return
    }
  }

  throw new PaymentAuthError(
    403,
    "Only the wedding owner, an authorized payment approver, or the vendor can perform this payment action"
  )
}

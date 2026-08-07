/**
 * Server-side premium gate for family wedding AI features.
 * Mirrors client `usePremium().isFamilyPremium` (weddings.isPremium).
 */

import { PaymentAuthError, verifyPaymentUser } from "@/lib/server/payment-auth"
import { getAdminDb } from "@/lib/server/firebase-admin"

export async function assertFamilyWeddingPremium(request: Request): Promise<{
  uid: string
  weddingId: string
}> {
  const user = await verifyPaymentUser(request)
  const userSnap = await getAdminDb().collection("users").doc(user.uid).get()
  if (!userSnap.exists) {
    throw new PaymentAuthError(403, "User profile not found")
  }

  const weddingId = userSnap.data()?.weddingId
  if (typeof weddingId !== "string" || !weddingId) {
    throw new PaymentAuthError(
      403,
      "No wedding linked to this account — wedding AI is a family premium feature"
    )
  }

  const weddingSnap = await getAdminDb().collection("weddings").doc(weddingId).get()
  if (!weddingSnap.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }

  const wedding = weddingSnap.data() as {
    isPremium?: boolean
    ownerId?: string
    memberUids?: string[]
  }

  const members = wedding.memberUids ?? []
  const isMember =
    wedding.ownerId === user.uid || members.includes(user.uid)
  if (!isMember) {
    throw new PaymentAuthError(403, "You are not a member of this wedding")
  }

  if (!wedding.isPremium) {
    throw new PaymentAuthError(
      403,
      "Premium required — upgrade to use the wedding planning AI assistant"
    )
  }

  return { uid: user.uid, weddingId }
}

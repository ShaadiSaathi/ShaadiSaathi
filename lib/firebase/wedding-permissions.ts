/**
 * Wedding financial permissions — owner vs collaborator.
 *
 * Owner always has full financial access via weddings/{id}.ownerId.
 * Collaborators default to view-only for money actions; the owner may grant
 * elevated access via weddings/{id}.paymentApproverUids.
 */

import type { FirestoreWedding } from "./types"
import type { WeddingMemberProfile } from "./collaborators"

export type WeddingFinancialRole = "owner" | "collaborator" | "none"

export function getWeddingFinancialRole(
  uid: string | null | undefined,
  wedding: Pick<FirestoreWedding, "ownerId" | "memberUids"> | null | undefined
): WeddingFinancialRole {
  if (!uid || !wedding?.ownerId) return "none"
  if (uid === wedding.ownerId) return "owner"
  if ((wedding.memberUids ?? []).includes(uid)) return "collaborator"
  return "none"
}

type WeddingPaymentFields = Pick<
  FirestoreWedding,
  "ownerId" | "memberUids" | "paymentApproverUids"
>

/** Owner, or collaborator listed on paymentApproverUids. */
export function canApproveWeddingPayments(
  uid: string | null | undefined,
  wedding: WeddingPaymentFields | null | undefined
): boolean {
  if (!uid || !wedding?.ownerId) return false
  if (uid === wedding.ownerId) return true
  return (wedding.paymentApproverUids ?? []).includes(uid)
}

export function isWeddingOwnerUid(
  uid: string | null | undefined,
  wedding: Pick<FirestoreWedding, "ownerId"> | null | undefined
): boolean {
  return Boolean(uid && wedding?.ownerId && uid === wedding.ownerId)
}

export function getWeddingOwnerProfile(
  members: WeddingMemberProfile[]
): WeddingMemberProfile | undefined {
  return members.find((m) => m.role === "owner")
}

export function getWeddingOwnerDisplayName(
  members: WeddingMemberProfile[],
  wedding?: Pick<FirestoreWedding, "organiserName"> | null
): string {
  const owner = getWeddingOwnerProfile(members)
  const name = owner?.name?.trim() || wedding?.organiserName?.trim()
  return name || "the wedding owner"
}

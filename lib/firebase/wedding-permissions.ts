/**
 * Wedding financial permissions — owner vs collaborator.
 *
 * Role is derived from weddings/{id}.ownerId (not a separate role field),
 * so a future owner-transfer only needs to update that one field.
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

/** Owner-only: deposits, balances, disputes, extra-work approvals. */
export function canApproveWeddingPayments(
  uid: string | null | undefined,
  wedding: Pick<FirestoreWedding, "ownerId" | "memberUids"> | null | undefined
): boolean {
  return getWeddingFinancialRole(uid, wedding) === "owner"
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

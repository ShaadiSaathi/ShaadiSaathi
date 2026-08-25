import { getAdminDb } from "@/lib/server/firebase-admin"
import { PaymentAuthError, verifyPaymentUser } from "@/lib/server/payment-auth"
import {
  type CollaboratorAccessEntry,
  type CollaboratorAccessMap,
  type CollaboratorRole,
  type CollaboratorScope,
  normalizeCollaboratorScopes,
  validateLimitedInviteScopes,
} from "@/lib/collaborator-access"
import { FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/premium"

export { verifyPaymentUser, PaymentAuthError }

type WeddingDoc = {
  isPremium?: boolean
  ownerId?: string
  memberUids?: string[]
  paymentApproverUids?: string[]
  collaboratorAccess?: CollaboratorAccessMap
  name?: string
}

export async function getWeddingForCollaboratorAdmin(
  weddingId: string
): Promise<{ exists: false } | ({ exists: true; id: string } & WeddingDoc)> {
  const snap = await getAdminDb().collection("weddings").doc(weddingId).get()
  if (!snap.exists) return { exists: false }
  return { exists: true, id: weddingId, ...(snap.data() as WeddingDoc) }
}

export async function assertWeddingOwner(
  weddingId: string,
  uid: string
): Promise<WeddingDoc & { id: string }> {
  const wedding = await getWeddingForCollaboratorAdmin(weddingId)
  if (!wedding.exists) {
    throw new PaymentAuthError(404, "Wedding not found")
  }
  if (wedding.ownerId !== uid) {
    throw new PaymentAuthError(403, "Only the wedding owner can manage collaborators")
  }
  return wedding
}

export function assertPremiumTieredCollaborators(wedding: WeddingDoc): void {
  if (!wedding.isPremium) {
    throw new PaymentAuthError(
      403,
      "Tiered collaborator access is available on Premium weddings only"
    )
  }
}

export async function countCollaboratorSlots(weddingId: string): Promise<number> {
  const db = getAdminDb()
  const weddingSnap = await db.collection("weddings").doc(weddingId).get()
  const memberCount =
    ((weddingSnap.data()?.memberUids as string[] | undefined) ?? []).length
  const pendingSnap = await db
    .collection("wedding_collaborator_invites")
    .where("weddingId", "==", weddingId)
    .where("status", "==", "pending")
    .get()
  return memberCount + pendingSnap.size
}

export async function assertCanInviteCollaborator(
  wedding: WeddingDoc & { id: string }
): Promise<void> {
  const max = wedding.isPremium
    ? PREMIUM_LIMITS.maxCollaborators
    : FREE_LIMITS.maxCollaborators
  const used = await countCollaboratorSlots(wedding.id)
  if (used >= max) {
    throw new PaymentAuthError(
      409,
      wedding.isPremium
        ? "You've reached the maximum number of family collaborators."
        : "Upgrade to Premium to invite more family collaborators."
    )
  }
}

export function buildCollaboratorAccessEntry(input: {
  role: CollaboratorRole
  scopes?: CollaboratorScope[]
  joinedAt?: number
}): CollaboratorAccessEntry {
  if (input.role === "limited") {
    return {
      role: "limited",
      scopes: validateLimitedInviteScopes(input.scopes),
      joinedAt: input.joinedAt ?? Date.now(),
    }
  }
  return {
    role: "full",
    joinedAt: input.joinedAt ?? Date.now(),
  }
}

export function mergeCollaboratorAccess(
  current: CollaboratorAccessMap | undefined,
  uid: string,
  entry: CollaboratorAccessEntry
): CollaboratorAccessMap {
  return {
    ...(current ?? {}),
    [uid]: entry,
  }
}

export function removeCollaboratorAccessEntry(
  current: CollaboratorAccessMap | undefined,
  uid: string
): CollaboratorAccessMap {
  const next = { ...(current ?? {}) }
  delete next[uid]
  return next
}

export function normalizeInviteRoleAndScopes(input: {
  role: CollaboratorRole
  scopes?: CollaboratorScope[]
}): { role: CollaboratorRole; scopes?: CollaboratorScope[] } {
  if (input.role === "limited") {
    return {
      role: "limited",
      scopes: validateLimitedInviteScopes(input.scopes),
    }
  }
  return { role: "full" }
}

export function parseCollaboratorRole(value: unknown): CollaboratorRole | null {
  return value === "full" || value === "limited" ? value : null
}

export function parseCollaboratorScopes(value: unknown): CollaboratorScope[] {
  if (!Array.isArray(value)) return []
  return normalizeCollaboratorScopes(
    value.filter((s): s is CollaboratorScope => typeof s === "string")
  )
}

/**
 * Premium tiered collaborator access — shared types and permission helpers.
 * Non-premium weddings use legacy flat membership (no collaboratorAccess map).
 */

export type CollaboratorRole = "full" | "limited"

/** Sections a limited collaborator may access. Full role implies all scopes. */
export type CollaboratorScope =
  | "guests"
  | "tasks"
  | "events"
  | "vendors"
  | "schedule"

export const COLLABORATOR_SCOPES: readonly CollaboratorScope[] = [
  "guests",
  "tasks",
  "events",
  "vendors",
  "schedule",
] as const

export const COLLABORATOR_SCOPE_LABELS: Record<CollaboratorScope, string> = {
  guests: "Guests",
  tasks: "Tasks",
  events: "Events",
  vendors: "Vendors",
  schedule: "Schedule",
}

export interface CollaboratorAccessEntry {
  role: CollaboratorRole
  /** Required when role is limited — which sections they can access. */
  scopes?: CollaboratorScope[]
  joinedAt: number
}

export type CollaboratorAccessMap = Record<string, CollaboratorAccessEntry>

type WeddingCollaboratorFields = {
  isPremium?: boolean
  ownerId?: string
  memberUids?: string[]
  collaboratorAccess?: CollaboratorAccessMap
}

export function normalizeCollaboratorScopes(
  scopes: CollaboratorScope[] | undefined
): CollaboratorScope[] {
  if (!scopes?.length) return []
  const allowed = new Set(COLLABORATOR_SCOPES)
  return scopes.filter((s) => allowed.has(s))
}

export function getCollaboratorAccessEntry(
  wedding: WeddingCollaboratorFields | null | undefined,
  uid: string | null | undefined
): CollaboratorAccessEntry | null {
  if (!uid || !wedding?.collaboratorAccess) return null
  return wedding.collaboratorAccess[uid] ?? null
}

/** Legacy flat access when wedding is not premium or user has no tier entry. */
export function usesLegacyCollaboratorAccess(
  wedding: WeddingCollaboratorFields | null | undefined,
  uid: string | null | undefined
): boolean {
  if (!wedding?.isPremium) return true
  if (!uid || uid === wedding.ownerId) return true
  return getCollaboratorAccessEntry(wedding, uid) == null
}

export function getCollaboratorRole(
  wedding: WeddingCollaboratorFields | null | undefined,
  uid: string | null | undefined
): "owner" | CollaboratorRole | "none" {
  if (!uid || !wedding?.ownerId) return "none"
  if (uid === wedding.ownerId) return "owner"
  if (!(wedding.memberUids ?? []).includes(uid)) return "none"
  if (usesLegacyCollaboratorAccess(wedding, uid)) return "full"
  return getCollaboratorAccessEntry(wedding, uid)?.role ?? "full"
}

export function collaboratorHasScope(
  wedding: WeddingCollaboratorFields | null | undefined,
  uid: string | null | undefined,
  scope: CollaboratorScope
): boolean {
  const role = getCollaboratorRole(wedding, uid)
  if (role === "owner" || role === "full") return true
  if (role === "none") return false
  const entry = getCollaboratorAccessEntry(wedding, uid)
  const scopes = normalizeCollaboratorScopes(entry?.scopes)
  if (scope === "schedule") {
    return scopes.includes("schedule") || scopes.includes("events") || scopes.includes("tasks")
  }
  return scopes.includes(scope)
}

/** Limited collaborators cannot read/write financial data; full can view (approve via paymentApproverUids). */
export function canAccessWeddingFinancialData(
  wedding: WeddingCollaboratorFields | null | undefined,
  uid: string | null | undefined
): boolean {
  const role = getCollaboratorRole(wedding, uid)
  if (role === "owner" || role === "full") return true
  return false
}

export function formatCollaboratorRoleLabel(
  role: "owner" | CollaboratorRole
): string {
  if (role === "owner") return "Owner"
  if (role === "full") return "Full collaborator"
  return "Limited collaborator"
}

export function validateLimitedInviteScopes(
  scopes: CollaboratorScope[] | undefined
): CollaboratorScope[] {
  const normalized = normalizeCollaboratorScopes(scopes)
  if (normalized.length === 0) {
    throw new Error("Choose at least one section for a limited collaborator.")
  }
  return normalized
}

/** Normalize to E.164 for consistent invite matching. */
export function normalizeCollaboratorPhone(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith("+")) return trimmed
  const digits = trimmed.replace(/\D/g, "")
  return digits ? `+${digits}` : trimmed
}

export function normalizeCollaboratorEmail(email: string): string {
  return email.trim().toLowerCase()
}

function phoneInviteDocId(weddingId: string, phone: string): string {
  const normalized = normalizeCollaboratorPhone(phone)
  const slug = normalized.replace(/[^\d+]/g, "").replace(/^\+/, "")
  return `${weddingId}_phone_${slug}`
}

function emailInviteDocId(weddingId: string, email: string): string {
  const normalized = normalizeCollaboratorEmail(email)
  const slug = normalized.replace(/[^a-z0-9]/g, "_")
  return `${weddingId}_email_${slug}`
}

export function collaboratorInviteDocId(input: {
  weddingId: string
  phone?: string
  email?: string
}): string {
  if (input.phone?.trim()) {
    return phoneInviteDocId(input.weddingId, input.phone)
  }
  if (input.email?.trim()) {
    return emailInviteDocId(input.weddingId, input.email)
  }
  throw new Error("Phone or email required for invite id.")
}

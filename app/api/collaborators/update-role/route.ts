import { NextResponse } from "next/server"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  assertPremiumTieredCollaborators,
  assertWeddingOwner,
  buildCollaboratorAccessEntry,
  mergeCollaboratorAccess,
  normalizeInviteRoleAndScopes,
  parseCollaboratorRole,
  parseCollaboratorScopes,
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/collaborator-auth"
import { setCollaboratorTierDoc } from "@/lib/server/collaborator-tiers"
import { setCollaboratorAuthClaims } from "@/lib/server/collaborator-claims"
import type { CollaboratorAccessEntry } from "@/lib/collaborator-access"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Collaborator management is not configured on this server." },
      { status: 503 }
    )
  }

  let uid: string
  try {
    ;({ uid } = await verifyPaymentUser(request))
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const weddingId =
    typeof payload.weddingId === "string" ? payload.weddingId.trim() : ""
  const collaboratorUid =
    typeof payload.collaboratorUid === "string" ? payload.collaboratorUid.trim() : ""
  const role = parseCollaboratorRole(payload.role)
  const scopes = parseCollaboratorScopes(payload.scopes)

  if (!weddingId || !collaboratorUid || !role) {
    return NextResponse.json(
      { error: "Missing weddingId, collaboratorUid, or valid role." },
      { status: 400 }
    )
  }

  let wedding
  try {
    wedding = await assertWeddingOwner(weddingId, uid)
    assertPremiumTieredCollaborators(wedding)
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  if (collaboratorUid === wedding.ownerId) {
    return NextResponse.json({ error: "Cannot change the owner's role." }, { status: 400 })
  }

  const memberUids = wedding.memberUids ?? []
  if (!memberUids.includes(collaboratorUid)) {
    return NextResponse.json({ error: "This person is not a collaborator." }, { status: 404 })
  }

  const { role: nextRole, scopes: nextScopes } = normalizeInviteRoleAndScopes({
    role,
    scopes,
  })

  const existingEntry = wedding.collaboratorAccess?.[collaboratorUid]
  const joinedAt = existingEntry?.joinedAt ?? Date.now()

  const entry: CollaboratorAccessEntry = buildCollaboratorAccessEntry({
    role: nextRole,
    scopes: nextScopes,
    joinedAt,
  })

  const collaboratorAccess = mergeCollaboratorAccess(
    wedding.collaboratorAccess,
    collaboratorUid,
    entry
  )

  const db = getAdminDb()
  const updates: Record<string, unknown> = { collaboratorAccess }

  if (nextRole === "limited") {
    const paymentApproverUids = (wedding.paymentApproverUids ?? []).filter(
      (id) => id !== collaboratorUid
    )
    updates.paymentApproverUids = paymentApproverUids
  }

  await db.collection("weddings").doc(weddingId).update(updates)
  await setCollaboratorTierDoc(weddingId, collaboratorUid, entry)
  await setCollaboratorAuthClaims(collaboratorUid, {
    weddingCollaboratorRole: nextRole,
    weddingCollaboratorScopes: nextScopes,
  })

  await db.collection("wedding_activity").add({
    weddingId,
    actorUid: uid,
    actorName: "Owner",
    action: "collaborator_role_changed",
    targetId: collaboratorUid,
    summary:
      nextRole === "limited"
        ? `Changed collaborator to limited (${(nextScopes ?? []).join(", ")})`
        : "Changed collaborator to full access",
    createdAt: Date.now(),
  })

  return NextResponse.json({ ok: true })
}

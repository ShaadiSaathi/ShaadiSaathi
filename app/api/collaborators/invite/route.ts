import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  assertCanInviteCollaborator,
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
import {
  collaboratorInviteDocId,
  normalizeCollaboratorEmail,
  normalizeCollaboratorPhone,
} from "@/lib/collaborator-access"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Collaborator invites are not configured on this server." },
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
  const phone =
    typeof payload.phone === "string" ? normalizeCollaboratorPhone(payload.phone) : ""
  const email =
    typeof payload.email === "string" ? normalizeCollaboratorEmail(payload.email) : ""
  const role = parseCollaboratorRole(payload.role) ?? "full"
  const scopes = parseCollaboratorScopes(payload.scopes)
  const invitedByName =
    typeof payload.invitedByName === "string" ? payload.invitedByName.trim() : ""

  if (!weddingId) {
    return NextResponse.json({ error: "Missing weddingId." }, { status: 400 })
  }
  if (!phone && !email) {
    return NextResponse.json(
      { error: "Enter a phone number or email address to invite." },
      { status: 400 }
    )
  }
  if (phone && (!phone.startsWith("+") || phone.length < 8)) {
    return NextResponse.json(
      { error: "Please enter a valid phone number with country code." },
      { status: 400 }
    )
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
  }

  let wedding
  try {
    wedding = await assertWeddingOwner(weddingId, uid)
    assertPremiumTieredCollaborators(wedding)
    await assertCanInviteCollaborator(wedding)
  } catch (err) {
    if (err instanceof PaymentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  const { role: inviteRole, scopes: inviteScopes } = normalizeInviteRoleAndScopes({
    role,
    scopes,
  })

  const inviteId = collaboratorInviteDocId({
    weddingId,
    phone: phone || undefined,
    email: email || undefined,
  })

  const db = getAdminDb()
  const inviteRef = db.collection("wedding_collaborator_invites").doc(inviteId)
  const existing = await inviteRef.get()
  if (existing.exists) {
    const data = existing.data()!
    if (data.status === "pending") {
      return NextResponse.json(
        { error: "An invite is already pending for this contact." },
        { status: 409 }
      )
    }
    if (data.status === "accepted") {
      return NextResponse.json(
        { error: "This person is already a member of your wedding." },
        { status: 409 }
      )
    }
  }

  const authUser = await getAdminAuth().getUser(uid)
  const inviterName =
    invitedByName ||
    (typeof authUser.displayName === "string" ? authUser.displayName : "Organiser")

  const invite = {
    id: inviteId,
    weddingId,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    role: inviteRole,
    ...(inviteRole === "limited" ? { scopes: inviteScopes } : {}),
    invitedByUid: uid,
    invitedByName: inviterName.slice(0, 80),
    weddingName: (wedding.name ?? "Your wedding").slice(0, 120),
    status: "pending",
    createdAt: Date.now(),
  }

  await inviteRef.set(invite)

  await db.collection("wedding_activity").add({
    weddingId,
    actorUid: uid,
    actorName: inviterName.slice(0, 80),
    action: "collaborator_invited",
    targetId: inviteId,
    summary: `Invited ${phone || email} as ${inviteRole} collaborator`,
    createdAt: Date.now(),
  })

  return NextResponse.json({ inviteId })
}

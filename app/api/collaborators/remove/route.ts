import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  assertPremiumTieredCollaborators,
  assertWeddingOwner,
  removeCollaboratorAccessEntry,
  PaymentAuthError,
  verifyPaymentUser,
} from "@/lib/server/collaborator-auth"
import {
  revokeCollaboratorSessions,
  setCollaboratorAuthClaims,
} from "@/lib/server/collaborator-claims"
import { deleteCollaboratorTierDoc } from "@/lib/server/collaborator-tiers"

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

  if (!weddingId || !collaboratorUid) {
    return NextResponse.json(
      { error: "Missing weddingId or collaboratorUid." },
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
    return NextResponse.json({ error: "Cannot remove the wedding owner." }, { status: 400 })
  }

  const memberUids = wedding.memberUids ?? []
  if (!memberUids.includes(collaboratorUid)) {
    return NextResponse.json({ error: "This person is not a collaborator." }, { status: 404 })
  }

  const db = getAdminDb()
  const weddingRef = db.collection("weddings").doc(weddingId)
  const userRef = db.collection("users").doc(collaboratorUid)
  const userSnap = await userRef.get()
  const removedName =
    (typeof userSnap.data()?.name === "string" && userSnap.data()!.name) || "Collaborator"

  const paymentApproverUids = (wedding.paymentApproverUids ?? []).filter(
    (id) => id !== collaboratorUid
  )
  const collaboratorAccess = removeCollaboratorAccessEntry(
    wedding.collaboratorAccess,
    collaboratorUid
  )

  await db.runTransaction(async (tx) => {
    tx.update(weddingRef, {
      memberUids: FieldValue.arrayRemove(collaboratorUid),
      paymentApproverUids,
      collaboratorAccess,
    })
    tx.set(
      userRef,
      {
        weddingId: FieldValue.delete(),
      },
      { merge: true }
    )
  })

  await deleteCollaboratorTierDoc(weddingId, collaboratorUid)
  await setCollaboratorAuthClaims(collaboratorUid, { weddingCollaboratorRole: "none" })
  await revokeCollaboratorSessions(collaboratorUid)

  await db.collection("wedding_activity").add({
    weddingId,
    actorUid: uid,
    actorName: "Owner",
    action: "collaborator_removed",
    targetId: collaboratorUid,
    summary: `Removed ${removedName} — access revoked immediately`,
    createdAt: Date.now(),
  })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { verifyPaymentUser, PaymentAuthError } from "@/lib/server/payment-auth"

export const runtime = "nodejs"

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith("+")) return trimmed
  const digits = trimmed.replace(/\D/g, "")
  return digits ? `+${digits}` : trimmed
}

function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a).replace(/\D/g, "")
  const nb = normalizePhone(b).replace(/\D/g, "")
  return na.length > 0 && na === nb
}

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

  const inviteId =
    typeof body === "object" &&
    body !== null &&
    "inviteId" in body &&
    typeof (body as { inviteId: unknown }).inviteId === "string"
      ? (body as { inviteId: string }).inviteId.trim()
      : ""

  if (!inviteId) {
    return NextResponse.json({ error: "Missing inviteId." }, { status: 400 })
  }

  const db = getAdminDb()
  const inviteRef = db.collection("wedding_collaborator_invites").doc(inviteId)
  const inviteSnap = await inviteRef.get()
  if (!inviteSnap.exists) {
    return NextResponse.json({ error: "This invite is no longer valid." }, { status: 404 })
  }

  const invite = inviteSnap.data()!
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "This invite has already been used or cancelled." },
      { status: 409 }
    )
  }

  const authUser = await getAdminAuth().getUser(uid)
  const authPhone = authUser.phoneNumber ?? ""
  const profileSnap = await db.collection("users").doc(uid).get()
  const profilePhone =
    typeof profileSnap.data()?.phone === "string" ? profileSnap.data()!.phone : ""

  const userPhone = authPhone || profilePhone
  if (!phonesMatch(userPhone, invite.phone as string)) {
    return NextResponse.json(
      {
        error:
          "This invite was sent to a different phone number. Please sign in with the number that was invited.",
      },
      { status: 403 }
    )
  }

  const weddingId = invite.weddingId as string
  const weddingRef = db.collection("weddings").doc(weddingId)
  const weddingSnap = await weddingRef.get()
  if (!weddingSnap.exists) {
    return NextResponse.json({ error: "This wedding no longer exists." }, { status: 404 })
  }

  const wedding = weddingSnap.data()!
  const memberUids = (wedding.memberUids as string[] | undefined) ?? []
  if (memberUids.includes(uid)) {
    await inviteRef.update({
      status: "accepted",
      acceptedAt: Date.now(),
      acceptedByUid: uid,
    })
    return NextResponse.json({ weddingId, alreadyMember: true })
  }

  const existingWeddingId = profileSnap.data()?.weddingId as string | undefined
  if (existingWeddingId && existingWeddingId !== weddingId) {
    return NextResponse.json(
      {
        error:
          "Your account is already linked to a different wedding. You can only belong to one wedding at a time.",
      },
      { status: 409 }
    )
  }

  const displayName =
    (typeof profileSnap.data()?.name === "string" && profileSnap.data()!.name) ||
    (typeof authUser.displayName === "string" && authUser.displayName) ||
    "Family member"

  await db.runTransaction(async (tx) => {
    tx.update(weddingRef, {
      memberUids: FieldValue.arrayUnion(uid),
    })
    tx.set(
      db.collection("users").doc(uid),
      {
        uid,
        role: "family",
        phone: normalizePhone(invite.phone as string),
        name: displayName,
        weddingId,
        createdAt: profileSnap.exists
          ? profileSnap.data()?.createdAt ?? Date.now()
          : Date.now(),
      },
      { merge: true }
    )
    tx.update(inviteRef, {
      status: "accepted",
      acceptedAt: Date.now(),
      acceptedByUid: uid,
    })
  })

  return NextResponse.json({
    weddingId,
    weddingName: wedding.name as string,
    firstEventDate: (wedding.firstEventDate as string) ?? "",
  })
}

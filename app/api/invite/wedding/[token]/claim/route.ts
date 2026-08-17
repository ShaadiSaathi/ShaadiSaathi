import { NextResponse } from "next/server"
import { makeGuestInviteToken } from "@/lib/guest-invite-token"
import type { EventId, RsvpSource, RsvpStatus } from "@/lib/mockData"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

const ALL_EVENTS: EventId[] = ["mehndi", "baraat", "walima"]

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Invite claiming is not configured on this server." },
      { status: 503 }
    )
  }

  const { token: weddingId } = await context.params
  if (!weddingId?.trim()) {
    return NextResponse.json({ error: "Missing wedding invite token." }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : ""
  const phone =
    typeof body === "object" &&
    body !== null &&
    "phone" in body &&
    typeof (body as { phone: unknown }).phone === "string"
      ? (body as { phone: string }).phone.trim()
      : ""

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { error: "Please enter your name (at least 2 characters)." },
      { status: 400 }
    )
  }

  const db = getAdminDb()
  const weddingSnap = await db.collection("weddings").doc(weddingId).get()
  if (!weddingSnap.exists) {
    return NextResponse.json({ error: "This wedding invite link is invalid." }, { status: 404 })
  }

  const guestsSnap = await db
    .collection("guests")
    .where("weddingId", "==", weddingId)
    .get()

  const wanted = normalizeName(name)
  const matches = guestsSnap.docs.filter(
    (d) => normalizeName(String(d.data().name ?? "")) === wanted
  )

  let match = matches[0]
  if (matches.length > 1 && phone) {
    const phoneDigits = phone.replace(/\D/g, "")
    const byPhone = matches.find((d) => {
      const existing = String(d.data().phone ?? "").replace(/\D/g, "")
      return existing.length >= 4 && existing.endsWith(phoneDigits.slice(-4))
    })
    if (byPhone) match = byPhone
  }

  if (match) {
    const data = match.data()
    return NextResponse.json({
      inviteToken: String(data.inviteToken || match.id),
      created: false,
      name: String(data.name ?? name),
    })
  }

  const inviteToken = makeGuestInviteToken()
  const id = `guest-${inviteToken}`
  const now = Date.now()
  const rsvp = Object.fromEntries(
    ALL_EVENTS.map((e) => [e, "pending" as RsvpStatus])
  ) as Record<EventId, RsvpStatus | null>
  const rsvpSource = Object.fromEntries(
    ALL_EVENTS.map((e) => [e, "organiser" as RsvpSource])
  ) as Record<EventId, RsvpSource | null>
  const rsvpUpdatedAt = Object.fromEntries(ALL_EVENTS.map((e) => [e, null])) as Record<
    EventId,
    number | null
  >
  const rsvpOrganiserAlert = Object.fromEntries(ALL_EVENTS.map((e) => [e, false])) as Record<
    EventId,
    boolean
  >

  await db.collection("guests").doc(inviteToken).set({
    id,
    weddingId,
    name,
    phone: phone || "+92 3XX ••• ••00",
    events: ALL_EVENTS,
    rsvp,
    rsvpSource,
    rsvpUpdatedAt,
    rsvpOrganiserAlert,
    inviteToken,
    notes: "Joined via wedding invite link",
    updatedAt: now,
  })

  return NextResponse.json({
    inviteToken,
    created: true,
    name,
  })
}

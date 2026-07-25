import { NextResponse } from "next/server"
import type { EventId, RsvpStatus } from "@/lib/mockData"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

type RsvpChoice = "confirmed" | "declined"

function isChoice(value: unknown): value is RsvpChoice {
  return value === "confirmed" || value === "declined"
}

function isEventId(value: unknown): value is EventId {
  return value === "mehndi" || value === "baraat" || value === "walima"
}

function isRespondedStatus(status: unknown): status is "confirmed" | "declined" {
  return status === "confirmed" || status === "declined"
}

/**
 * Public guest RSVP writes go through Admin SDK so unauthenticated invite
 * visitors are not blocked by client Firestore rules.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "RSVP service is not configured. Please try again later." },
      { status: 503 }
    )
  }

  const { token } = await context.params
  if (!token?.trim()) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const status = record.status
  if (!isChoice(status)) {
    return NextResponse.json({ error: "Invalid RSVP status." }, { status: 400 })
  }

  const db = getAdminDb()
  const ref = db.collection("guests").doc(token)
  const snap = await ref.get()
  if (!snap.exists) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 })
  }

  const existing = snap.data() as {
    events?: EventId[]
    rsvp?: Partial<Record<EventId, RsvpStatus | null>>
  }
  const invited = (existing.events ?? []).filter(isEventId)
  const now = Date.now()
  const patch: Record<string, string | number | boolean> = { updatedAt: now }

  if (record.bulk === true) {
    const eventIds = Array.isArray(record.eventIds)
      ? record.eventIds.filter(isEventId)
      : invited
    const targets = eventIds.filter((id) => invited.includes(id))
    if (targets.length === 0) {
      return NextResponse.json({ error: "No events to update." }, { status: 400 })
    }
    for (const eventId of targets) {
      const prev = existing.rsvp?.[eventId]
      const isChange = isRespondedStatus(prev) && prev !== status
      patch[`rsvp.${eventId}`] = status
      patch[`rsvpSource.${eventId}`] = "guest"
      patch[`rsvpUpdatedAt.${eventId}`] = now
      if (isChange) patch[`rsvpOrganiserAlert.${eventId}`] = true
    }
  } else {
    const eventId = record.eventId
    if (!isEventId(eventId) || !invited.includes(eventId)) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 })
    }
    const prev = existing.rsvp?.[eventId]
    const isChange = isRespondedStatus(prev) && prev !== status
    patch[`rsvp.${eventId}`] = status
    patch[`rsvpSource.${eventId}`] = "guest"
    patch[`rsvpUpdatedAt.${eventId}`] = now
    if (isChange) patch[`rsvpOrganiserAlert.${eventId}`] = true
  }

  try {
    await ref.update(patch)
    console.info("[invite-rsvp] write ok", {
      token,
      bulk: record.bulk === true,
      status,
      keys: Object.keys(patch),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[invite-rsvp] write failed", err)
    return NextResponse.json(
      { error: "Something went wrong, please try again." },
      { status: 500 }
    )
  }
}

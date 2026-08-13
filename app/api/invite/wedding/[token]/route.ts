import { NextResponse } from "next/server"
import type { InviteThemeId } from "@/lib/premium"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { DEFAULT_WEDDING_TIMEZONE } from "@/lib/events/rsvp-lock"

export const runtime = "nodejs"

/** Public invite card — no organiser phone, member UIDs, or share code. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Invite service is not configured." }, { status: 503 })
  }

  const { token: weddingId } = await context.params
  if (!weddingId?.trim() || weddingId.length > 128) {
    return NextResponse.json({ error: "Missing wedding invite token." }, { status: 400 })
  }

  const snap = await getAdminDb().collection("weddings").doc(weddingId.trim()).get()
  if (!snap.exists) {
    return NextResponse.json({ error: "This wedding invite link is invalid." }, { status: 404 })
  }

  const data = snap.data() ?? {}
  const inviteTheme = data.inviteTheme === "classic" || typeof data.inviteTheme === "string"
    ? (data.inviteTheme as InviteThemeId)
    : "classic"

  return NextResponse.json(
    {
      id: snap.id,
      name: typeof data.name === "string" ? data.name : "",
      couple: typeof data.couple === "string" ? data.couple : "",
      inviteTheme,
      isPremium: data.isPremium === true,
      firstEventDate: typeof data.firstEventDate === "string" ? data.firstEventDate : "",
      timezone:
        typeof data.timezone === "string" && data.timezone
          ? data.timezone
          : DEFAULT_WEDDING_TIMEZONE,
      eventOverrides:
        data.eventOverrides && typeof data.eventOverrides === "object"
          ? data.eventOverrides
          : {},
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

import type { InviteThemeId } from "@/lib/premium"
import type { WeddingEventOverrides } from "@/lib/events/rsvp-lock"
import { DEFAULT_WEDDING_TIMEZONE } from "@/lib/events/rsvp-lock"

export type PublicWeddingInfo = {
  id: string
  name: string
  couple: string
  inviteTheme: InviteThemeId
  isPremium: boolean
  firstEventDate: string
  timezone: string
  eventOverrides: WeddingEventOverrides
}

export async function fetchPublicWedding(
  weddingId: string
): Promise<PublicWeddingInfo | null> {
  const res = await fetch(`/api/invite/wedding/${encodeURIComponent(weddingId)}`, {
    method: "GET",
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Could not load this invitation")
  const data = (await res.json()) as Partial<PublicWeddingInfo>
  if (!data.id || !data.name) return null
  return {
    id: data.id,
    name: data.name,
    couple: typeof data.couple === "string" ? data.couple : data.name,
    inviteTheme: (data.inviteTheme as InviteThemeId) || "classic",
    isPremium: Boolean(data.isPremium),
    firstEventDate: typeof data.firstEventDate === "string" ? data.firstEventDate : "",
    timezone: typeof data.timezone === "string" ? data.timezone : DEFAULT_WEDDING_TIMEZONE,
    eventOverrides: (data.eventOverrides ?? {}) as WeddingEventOverrides,
  }
}

import type { EventId, RsvpStatus } from "@/lib/mockData"

type RsvpChoice = Exclude<RsvpStatus, "cancelled" | "pending">

async function postRsvp(
  inviteToken: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`/api/invite/${encodeURIComponent(inviteToken)}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong, please try again.")
  }
}

/** Guest RSVP for one event via server (Admin SDK) — no Firebase Auth required. */
export async function updateGuestRsvpByGuestViaApi(
  inviteToken: string,
  eventId: EventId,
  status: RsvpChoice
): Promise<void> {
  console.info("[guest-rsvp] individual write starting", { inviteToken, eventId, status })
  try {
    await postRsvp(inviteToken, { eventId, status })
    console.info("[guest-rsvp] individual write resolved ok", { inviteToken, eventId, status })
  } catch (err) {
    console.error("[guest-rsvp] individual write failed", { inviteToken, eventId, status, err })
    throw err
  }
}

/** Bulk guest RSVP via server (Admin SDK). */
export async function updateGuestRsvpBulkByGuestViaApi(
  inviteToken: string,
  status: RsvpChoice,
  eventIds: EventId[]
): Promise<void> {
  console.info("[guest-rsvp] bulk write starting", { inviteToken, status, eventIds })
  try {
    await postRsvp(inviteToken, { bulk: true, status, eventIds })
    console.info("[guest-rsvp] bulk write resolved ok", { inviteToken, status, eventIds })
  } catch (err) {
    console.error("[guest-rsvp] bulk write failed", { inviteToken, status, eventIds, err })
    throw err
  }
}

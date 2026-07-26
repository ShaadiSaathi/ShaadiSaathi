import type { EventId, RsvpStatus } from "@/lib/mockData"
import {
  updateGuestRsvpBulkByGuest,
  updateGuestRsvpByGuest,
} from "@/lib/firebase/guests"

type RsvpChoice = Exclude<RsvpStatus, "cancelled" | "pending">

function friendlyRsvpError(err: unknown): Error {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : ""
  const message = err instanceof Error ? err.message : String(err ?? "")

  if (
    code.includes("permission-denied") ||
    /permission/i.test(message) ||
    /insufficient permissions/i.test(message)
  ) {
    return new Error(
      "Something went wrong saving your response (permission denied). Please try again, or contact the family."
    )
  }

  if (code.includes("unavailable") || /network|offline|Failed to fetch/i.test(message)) {
    return new Error("Connection issue — please check your network and try again.")
  }

  return new Error("Something went wrong, please try again.")
}

/**
 * Persist a guest RSVP from the public invite page.
 *
 * Uses the client Firestore SDK (not Admin). Live security rules allow
 * unauthenticated RSVP-only updates on a guest doc when you know the invite
 * token (doc id). The Admin API path was abandoned because firebase-admin
 * crashes on Vercel (ERR_REQUIRE_ESM) and the service account was never set.
 */
export async function updateGuestRsvpByGuestViaApi(
  inviteToken: string,
  eventId: EventId,
  status: RsvpChoice
): Promise<void> {
  console.info("[guest-rsvp] individual write starting", { inviteToken, eventId, status })
  try {
    await updateGuestRsvpByGuest(inviteToken, eventId, status)
    console.info("[guest-rsvp] individual write resolved ok", { inviteToken, eventId, status })
  } catch (err) {
    console.error("[guest-rsvp] individual write failed", { inviteToken, eventId, status, err })
    throw friendlyRsvpError(err)
  }
}

/** Bulk guest RSVP from the public invite page (client Firestore). */
export async function updateGuestRsvpBulkByGuestViaApi(
  inviteToken: string,
  status: RsvpChoice,
  eventIds: EventId[]
): Promise<void> {
  console.info("[guest-rsvp] bulk write starting", { inviteToken, status, eventIds })
  try {
    await updateGuestRsvpBulkByGuest(inviteToken, status, eventIds)
    console.info("[guest-rsvp] bulk write resolved ok", { inviteToken, status, eventIds })
  } catch (err) {
    console.error("[guest-rsvp] bulk write failed", { inviteToken, status, eventIds, err })
    throw friendlyRsvpError(err)
  }
}

/**
 * Shared constants for time-based booking automation.
 * Used by Next.js server routes and mirrored in Cloud Functions.
 */

/** Hours a vendor has to respond before a dispute auto-resolves for the family. */
export const DISPUTE_VENDOR_RESPONSE_HOURS = 48

/** Hours after scheduled arrival before a missing check-in becomes a no-show. */
export const NO_SHOW_GRACE_PERIOD_HOURS = 2

/** Default event start times (Asia/Karachi wall clock) when wedding overrides are absent. */
export const DEFAULT_EVENT_TIMES: Record<string, string> = {
  mehndi: "18:00",
  baraat: "11:00",
  walima: "19:30",
}

export function disputeVendorResponseDeadlineAt(submittedAtMs: number): number {
  return submittedAtMs + DISPUTE_VENDOR_RESPONSE_HOURS * 60 * 60 * 1000
}

/**
 * Parse YYYY-MM-DD + "HH:MM" (24h) into epoch ms in local interpretation.
 * Event dates are calendar dates without an explicit timezone on the booking;
 * we treat them as Asia/Karachi-equivalent wall times for automation.
 */
export function scheduledArrivalMs(eventDate: string, time24h: string): number {
  const [y, m, d] = eventDate.split("-").map(Number)
  const [hh, mm] = time24h.split(":").map(Number)
  if (!y || !m || !d || hh == null || mm == null) return NaN
  // Construct as UTC+5 (Asia/Karachi, no DST) so server TZ doesn't drift.
  return Date.UTC(y, m - 1, d, hh - 5, mm, 0, 0)
}

export function gracePeriodEndsMs(arrivalMs: number): number {
  return arrivalMs + NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000
}

export function defaultArrivalTimeForEvent(eventId: string): string {
  return DEFAULT_EVENT_TIMES[eventId] ?? "12:00"
}

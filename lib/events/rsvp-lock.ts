import {
  EVENTS,
  type EventId,
  type WeddingEvent,
} from "@/lib/mockData"

/**
 * Weddings do not yet store an explicit timezone. Shaadi Saathi defaults to
 * Pakistan Standard Time (UTC+5, no DST) for lock calculations so every guest
 * sees the same cutoff regardless of device locale.
 */
export const DEFAULT_WEDDING_TIMEZONE = "Asia/Karachi"
export const DEFAULT_WEDDING_UTC_OFFSET = "+05:00"

export type RsvpLockPresetHours = 24 | 48 | 72

export const RSVP_LOCK_PRESETS: Array<{
  value: number | null
  label: string
}> = [
  { value: null, label: "Don't lock" },
  { value: 24, label: "24 hours before" },
  { value: 48, label: "48 hours before" },
  { value: 72, label: "72 hours before" },
]

/** Per-event schedule / lock overrides stored on the wedding (additive). */
export interface WeddingEventOverride {
  date?: string
  time?: string
  /** Hours before event start when guest RSVPs lock. null/undefined = no lock. */
  rsvpLockHoursBefore?: number | null
}

export type WeddingEventOverrides = Partial<Record<EventId, WeddingEventOverride>>

export interface ResolvedWeddingEvent extends WeddingEvent {
  rsvpLockHoursBefore?: number | null
}

const LOCAL_SCHEDULE_KEY = "shaadi-saathi-event-schedule"

export function loadLocalEventOverrides(): WeddingEventOverrides {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(LOCAL_SCHEDULE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as WeddingEventOverrides
  } catch {
    return {}
  }
}

export function saveLocalEventOverride(
  eventId: EventId,
  patch: WeddingEventOverride
): WeddingEventOverrides {
  const current = loadLocalEventOverrides()
  const next: WeddingEventOverrides = {
    ...current,
    [eventId]: {
      ...current[eventId],
      ...patch,
    },
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_SCHEDULE_KEY, JSON.stringify(next))
  }
  return next
}

/** Parse display times like "6:00 PM" or "11:00 AM" into 24h parts. */
export function parseDisplayTime(time: string): { hours: number; minutes: number } | null {
  const trimmed = time.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) {
    const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/)
    if (!twentyFour) return null
    const h = Number(twentyFour[1])
    const m = Number(twentyFour[2])
    if (h < 0 || h > 23 || m < 0 || m > 59) return null
    return { hours: h, minutes: m }
  }
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3]!.toUpperCase()
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null
  if (period === "PM" && hours < 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return { hours, minutes }
}

export function formatDisplayTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM"
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`
}

export function displayTimeToInputValue(time: string): string {
  const parsed = parseDisplayTime(time)
  if (!parsed) return "18:00"
  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`
}

export function inputValueToDisplayTime(value: string): string {
  const [h, m] = value.split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "6:00 PM"
  return formatDisplayTime(h, m)
}

/**
 * Event start instant as UTC epoch ms, interpreting date+time in the wedding timezone.
 * For Asia/Karachi we use a fixed +05:00 offset (no DST).
 */
export function getEventStartUtcMs(
  dateIso: string,
  timeDisplay: string,
  timeZone: string = DEFAULT_WEDDING_TIMEZONE
): number | null {
  const parsed = parseDisplayTime(timeDisplay)
  if (!parsed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null

  const hh = String(parsed.hours).padStart(2, "0")
  const mm = String(parsed.minutes).padStart(2, "0")
  const offset =
    timeZone === "Asia/Karachi" || timeZone === "PKT"
      ? DEFAULT_WEDDING_UTC_OFFSET
      : DEFAULT_WEDDING_UTC_OFFSET

  const ms = Date.parse(`${dateIso}T${hh}:${mm}:00${offset}`)
  return Number.isFinite(ms) ? ms : null
}

export function resolveWeddingEvent(
  eventId: EventId,
  overrides?: WeddingEventOverrides | null
): ResolvedWeddingEvent | undefined {
  const base = EVENTS.find((e) => e.id === eventId)
  if (!base) return undefined
  const override = overrides?.[eventId]
  return {
    ...base,
    date: override?.date?.trim() || base.date,
    time: override?.time?.trim() || base.time,
    rsvpLockHoursBefore:
      override && "rsvpLockHoursBefore" in override
        ? override.rsvpLockHoursBefore ?? null
        : base.rsvpLockHoursBefore ?? null,
  }
}

export function resolveAllWeddingEvents(
  overrides?: WeddingEventOverrides | null
): ResolvedWeddingEvent[] {
  return EVENTS.map((e) => resolveWeddingEvent(e.id, overrides)!).filter(Boolean)
}

/**
 * Shared lock check for individual guests and guest groups.
 * Returns true when guest-facing RSVP controls should be read-only.
 */
export function isEventRsvpLocked(
  event: Pick<ResolvedWeddingEvent, "date" | "time" | "rsvpLockHoursBefore">,
  options?: {
    nowMs?: number
    timeZone?: string
  }
): boolean {
  const hours = event.rsvpLockHoursBefore
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return false

  const startMs = getEventStartUtcMs(
    event.date,
    event.time,
    options?.timeZone ?? DEFAULT_WEDDING_TIMEZONE
  )
  if (startMs == null) return false

  const lockAtMs = startMs - hours * 60 * 60 * 1000
  const nowMs = options?.nowMs ?? Date.now()
  return nowMs >= lockAtMs
}

export function getRsvpLockCutoffLabel(
  event: Pick<ResolvedWeddingEvent, "date" | "time" | "rsvpLockHoursBefore" | "name">,
  timeZone: string = DEFAULT_WEDDING_TIMEZONE
): string | null {
  const hours = event.rsvpLockHoursBefore
  if (hours == null || hours <= 0) return null
  const startMs = getEventStartUtcMs(event.date, event.time, timeZone)
  if (startMs == null) return null
  const lockAt = new Date(startMs - hours * 60 * 60 * 1000)
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone === "PKT" ? "Asia/Karachi" : timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(lockAt)
  } catch {
    return lockAt.toISOString()
  }
}

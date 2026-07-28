"use client"

import { useEffect, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { updateWeddingEventOverride } from "@/lib/firebase/weddings"
import {
  DEFAULT_WEDDING_TIMEZONE,
  RSVP_LOCK_PRESETS,
  displayTimeToInputValue,
  getRsvpLockCutoffLabel,
  inputValueToDisplayTime,
  isEventRsvpLocked,
  loadLocalEventOverrides,
  resolveWeddingEvent,
  saveLocalEventOverride,
  type WeddingEventOverride,
} from "@/lib/events/rsvp-lock"
import type { EventId } from "@/lib/mockData"

export default function EventRsvpLockSettings({
  eventId,
  onSaved,
}: {
  eventId: EventId
  onSaved?: () => void
}) {
  const { isFirebaseMode } = useAuth()
  const { weddingId, wedding } = useWedding()
  const [date, setDate] = useState("")
  const [timeInput, setTimeInput] = useState("18:00")
  const [lockHours, setLockHours] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timeZone = wedding?.timezone ?? DEFAULT_WEDDING_TIMEZONE
  const overrides = isFirebaseMode
    ? wedding?.eventOverrides ?? {}
    : loadLocalEventOverrides()
  const resolved = resolveWeddingEvent(eventId, overrides)

  useEffect(() => {
    if (!resolved) return
    setDate(resolved.date)
    setTimeInput(displayTimeToInputValue(resolved.time))
    setLockHours(
      resolved.rsvpLockHoursBefore == null ? null : Number(resolved.rsvpLockHoursBefore)
    )
  }, [eventId, resolved?.date, resolved?.time, resolved?.rsvpLockHoursBefore])

  if (!resolved) return null

  const previewEvent = {
    ...resolved,
    date,
    time: inputValueToDisplayTime(timeInput),
    rsvpLockHoursBefore: lockHours,
  }
  const currentlyLocked = isEventRsvpLocked(previewEvent, { timeZone })
  const cutoffLabel = getRsvpLockCutoffLabel(previewEvent, timeZone)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    const patch: WeddingEventOverride = {
      date,
      time: inputValueToDisplayTime(timeInput),
      rsvpLockHoursBefore: lockHours,
    }
    try {
      if (isFirebaseMode && weddingId) {
        await updateWeddingEventOverride(weddingId, eventId, patch)
      } else {
        saveLocalEventOverride(eventId, patch)
      }
      setMessage("Saved. Guest RSVP lock updates immediately from this schedule.")
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      aria-labelledby={`rsvp-lock-${eventId}`}
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2
        id={`rsvp-lock-${eventId}`}
        className="font-display text-lg font-semibold text-maroon-dark sm:text-xl"
      >
        Schedule & RSVP lock
      </h2>
      <p className="mt-1 text-sm text-maroon/60">
        Guests won&apos;t be able to change their RSVP after this point — useful for giving
        vendors a final headcount. You can still edit any response yourself anytime.
      </p>

      <form onSubmit={(e) => void handleSave(e)} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`event-date-${eventId}`} className="block text-sm font-medium text-maroon/70">
              Event date
            </label>
            <input
              id={`event-date-${eventId}`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-gold/20 bg-ivory/40 px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
            />
          </div>
          <div>
            <label htmlFor={`event-time-${eventId}`} className="block text-sm font-medium text-maroon/70">
              Start time
            </label>
            <input
              id={`event-time-${eventId}`}
              type="time"
              required
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-gold/20 bg-ivory/40 px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-maroon/70">Lock RSVPs before this event</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {RSVP_LOCK_PRESETS.map((preset) => {
              const selected = lockHours === preset.value
              return (
                <button
                  key={String(preset.value)}
                  type="button"
                  onClick={() => setLockHours(preset.value)}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                    selected
                      ? "bg-maroon text-ivory"
                      : "border border-gold/30 text-maroon/60 hover:border-gold/50"
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="rounded-xl border border-gold/15 bg-ivory/60 px-4 py-3 text-sm text-maroon/65">
          {lockHours == null ? (
            <p>No lock — guests can change RSVPs anytime (current default).</p>
          ) : (
            <p>
              Lock calculates live from the event start in{" "}
              <span className="font-medium text-maroon-dark">{timeZone}</span>
              {cutoffLabel ? (
                <>
                  . Guest RSVPs close around{" "}
                  <span className="font-medium text-maroon-dark">{cutoffLabel}</span>.
                </>
              ) : (
                "."
              )}{" "}
              Right now this event is{" "}
              <span className="font-semibold text-maroon-dark">
                {currentlyLocked ? "locked for guests" : "still open for guests"}
              </span>
              .
            </p>
          )}
        </div>

        {error && <p className="text-sm text-rose-700">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <GoldButton type="submit" disabled={saving} className="min-h-11">
          {saving ? "Saving…" : "Save schedule & lock"}
        </GoldButton>
      </form>
    </section>
  )
}

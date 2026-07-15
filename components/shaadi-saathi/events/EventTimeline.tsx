"use client"

import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useEventDetail } from "@/components/shaadi-saathi/events/EventDetailContext"
import type { EventId } from "@/lib/mockData"

interface EventTimelineProps {
  eventId: EventId
}

export default function EventTimeline({ eventId }: EventTimelineProps) {
  const {
    getTimeline,
    addTimelineEntry,
    updateTimelineEntry,
    removeTimelineEntry,
    moveTimelineEntry,
  } = useEventDetail()

  const entries = getTimeline(eventId)
  const [showAdd, setShowAdd] = useState(false)
  const [newTime, setNewTime] = useState("")
  const [newLabel, setNewLabel] = useState("")

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTime.trim() || !newLabel.trim()) return
    addTimelineEntry(eventId, { time: newTime.trim(), label: newLabel.trim() })
    setNewTime("")
    setNewLabel("")
    setShowAdd(false)
  }

  return (
    <section
      aria-labelledby="day-schedule-heading"
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="day-schedule-heading" className="font-display text-lg font-semibold text-maroon-dark sm:text-xl">
            Day-of Schedule
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-maroon/50">
            Run-of-show for this event — distinct from the wedding-wide schedule.
          </p>
        </div>
        <GoldButton type="button" variant="ghost" onClick={() => setShowAdd(true)}>
          + Add entry
        </GoldButton>
      </div>

      <div className="relative">
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent sm:left-[11px]"
          aria-hidden="true"
        />

        <ol className="space-y-4" role="list">
          {entries.map((entry, i) => (
            <li key={entry.id} className="relative flex gap-4 pl-6 sm:pl-8">
              <span
                className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-gold bg-ivory sm:h-4 sm:w-4"
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1 rounded-xl border border-gold/10 bg-ivory/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`time-${entry.id}`}>
                    Time for {entry.label}
                  </label>
                  <input
                    id={`time-${entry.id}`}
                    type="text"
                    value={entry.time}
                    onChange={(e) =>
                      updateTimelineEntry(eventId, entry.id, { time: e.target.value })
                    }
                    className="min-h-[44px] w-20 shrink-0 rounded-lg border border-gold/20 bg-white px-2 py-1 text-xs font-semibold text-maroon-dark focus:border-maroon/30 focus:outline-none"
                    aria-label={`Time: ${entry.label}`}
                  />
                  <label className="sr-only" htmlFor={`label-${entry.id}`}>
                    Activity description
                  </label>
                  <input
                    id={`label-${entry.id}`}
                    type="text"
                    value={entry.label}
                    onChange={(e) =>
                      updateTimelineEntry(eventId, entry.id, { label: e.target.value })
                    }
                    className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-gold/20 bg-white px-2 py-1 text-sm text-maroon-dark focus:border-maroon/30 focus:outline-none"
                  />
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveTimelineEntry(eventId, entry.id, "up")}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-1.5 py-0.5 text-sm text-maroon/40 hover:text-maroon disabled:opacity-30"
                    aria-label={`Move ${entry.label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === entries.length - 1}
                    onClick={() => moveTimelineEntry(eventId, entry.id, "down")}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-1.5 py-0.5 text-sm text-maroon/40 hover:text-maroon disabled:opacity-30"
                    aria-label={`Move ${entry.label} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTimelineEntry(eventId, entry.id)}
                    className="ml-auto inline-flex min-h-[44px] items-center rounded-lg px-2.5 py-0.5 text-xs text-rose-400 hover:text-rose-600"
                    aria-label={`Remove ${entry.label}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-4 rounded-xl border border-gold/20 bg-ivory/50 p-4"
        >
          <p className="mb-3 text-sm font-medium text-maroon/70">New timeline entry</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="new-time">
              Time
            </label>
            <input
              id="new-time"
              type="text"
              placeholder="e.g. 6:00 PM"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="min-h-[44px] rounded-lg border border-gold/20 bg-white px-3 py-2 text-sm focus:border-maroon/30 focus:outline-none"
              required
            />
            <label className="sr-only" htmlFor="new-label">
              Activity
            </label>
            <input
              id="new-label"
              type="text"
              placeholder="e.g. Guest arrival"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-gold/20 bg-white px-3 py-2 text-sm focus:border-maroon/30 focus:outline-none"
              required
            />
            <GoldButton type="submit">Add</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </GoldButton>
          </div>
        </form>
      )}
    </section>
  )
}

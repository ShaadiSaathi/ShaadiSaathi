"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { BookingRequest, VendorJob } from "@/lib/mockVendorPortal"

type CalendarItem = {
  id: string
  date: string
  kind: "confirmed" | "pending"
  familyName: string
  weddingName: string
  eventName: string
  venue?: string
  href: string
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function toDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${year}-${m}-${d}`
}

function buildItems(
  jobs: VendorJob[],
  requests: BookingRequest[]
): CalendarItem[] {
  const confirmed: CalendarItem[] = jobs
    .filter((j) => j.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(j.eventDate))
    .map((j) => ({
      id: j.id,
      date: j.eventDate,
      kind: "confirmed" as const,
      familyName: j.familyName,
      weddingName: j.weddingName,
      eventName: j.eventName,
      venue: j.venue,
      href: `/vendor/jobs/${j.id}`,
    }))

  const pending: CalendarItem[] = requests
    .filter((r) => r.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(r.eventDate))
    .map((r) => ({
      id: r.id,
      date: r.eventDate,
      kind: "pending" as const,
      familyName: r.familyName,
      weddingName: r.weddingName,
      eventName: r.eventName,
      venue: r.venue,
      href: "/vendor/requests",
    }))

  return [...confirmed, ...pending]
}

interface VendorBookingCalendarProps {
  jobs: VendorJob[]
  requests?: BookingRequest[]
  /** Compact mode for dashboard embed */
  compact?: boolean
}

/** Month grid of confirmed jobs + pending requests for a vendor. */
export default function VendorBookingCalendar({
  jobs,
  requests = [],
  compact = false,
}: VendorBookingCalendarProps) {
  const now = new Date()
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const items = useMemo(() => buildItems(jobs, requests), [jobs, requests])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [items])

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const todayKey = now.toISOString().slice(0, 10)
  const selectedItems = selectedDate ? byDate.get(selectedDate) ?? [] : []

  function shiftMonth(delta: number) {
    setSelectedDate(null)
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const cells: Array<{ day: number | null; key: string }> = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, key: `pad-${i}` })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: `d-${day}` })
  }

  return (
    <section
      className={`rounded-2xl border border-gold/25 bg-white ${compact ? "p-4" : "p-5"}`}
      aria-labelledby="vendor-booking-calendar"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="vendor-booking-calendar"
            className={compact ? "text-base font-semibold text-maroon-dark" : "shaadi-section-title"}
          >
            Booking calendar
          </h2>
          {!compact ? (
            <p className="mt-1 text-sm text-maroon/55">
              Confirmed jobs and pending requests across families
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-maroon hover:bg-ivory"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="min-w-[9.5rem] text-center text-sm font-semibold text-maroon-dark">
            {monthLabel(cursor.year, cursor.month)}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-maroon hover:bg-ivory"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-maroon/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.day == null) {
            return <div key={cell.key} className="min-h-[3.25rem]" />
          }
          const dateKey = toDateKey(cursor.year, cursor.month, cell.day)
          const dayItems = byDate.get(dateKey) ?? []
          const hasConfirmed = dayItems.some((i) => i.kind === "confirmed")
          const hasPending = dayItems.some((i) => i.kind === "pending")
          const competing =
            dayItems.filter((i) => i.kind === "pending").length > 1
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() =>
                setSelectedDate((prev) => (prev === dateKey ? null : dateKey))
              }
              className={`relative flex min-h-[3.25rem] flex-col items-start rounded-lg border p-1.5 text-left transition-colors ${
                isSelected
                  ? "border-maroon bg-maroon/5"
                  : "border-transparent hover:border-gold/30 hover:bg-ivory/80"
              } ${isToday ? "ring-1 ring-gold/50" : ""}`}
              aria-pressed={isSelected}
              aria-label={`${dateKey}${dayItems.length ? `, ${dayItems.length} booking${dayItems.length === 1 ? "" : "s"}` : ""}`}
            >
              <span
                className={`text-xs font-semibold ${
                  isToday ? "text-maroon" : "text-maroon/70"
                }`}
              >
                {cell.day}
              </span>
              {dayItems.length > 0 ? (
                <span className="mt-auto flex w-full flex-wrap gap-0.5">
                  {hasConfirmed ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                      title="Confirmed"
                    />
                  ) : null}
                  {hasPending ? (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        competing ? "bg-amber-600" : "bg-amber-400"
                      }`}
                      title={competing ? "Competing requests" : "Pending"}
                    />
                  ) : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-maroon/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending request
        </span>
      </div>

      {selectedDate ? (
        <div className="mt-4 border-t border-gold/20 pt-4">
          <p className="text-sm font-semibold text-maroon-dark">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          {selectedItems.length === 0 ? (
            <p className="mt-2 text-sm text-maroon/55">No bookings on this date.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedItems.map((item) => {
                const sameDatePending =
                  item.kind === "pending" &&
                  selectedItems.filter((i) => i.kind === "pending").length > 1
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      href={item.href}
                      className={`block rounded-xl border px-3 py-2.5 transition-shadow hover:shadow-sm ${
                        item.kind === "confirmed"
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-amber-200 bg-amber-50/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            item.kind === "confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {item.kind === "confirmed" ? "Confirmed" : "Pending"}
                        </span>
                        {sameDatePending ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                            Competing request
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-maroon-dark">
                        {item.familyName}
                        {item.weddingName ? ` · ${item.weddingName}` : ""}
                      </p>
                      <p className="text-xs text-maroon/60">
                        {item.eventName}
                        {item.venue ? ` · ${item.venue}` : ""}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-maroon/45">
          Tap a date to see family and event details.
        </p>
      )}
    </section>
  )
}

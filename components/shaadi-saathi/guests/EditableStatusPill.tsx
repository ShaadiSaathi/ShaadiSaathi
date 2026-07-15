"use client"

import { useId } from "react"
import type { RsvpStatus } from "@/lib/mockData"

export const RSVP_STATUS_OPTIONS: {
  value: RsvpStatus
  label: string
  dot: string
  badge: string
}[] = [
  {
    value: "pending",
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    value: "declined",
    label: "Declined",
    dot: "bg-rose-400",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
]

const config = Object.fromEntries(
  RSVP_STATUS_OPTIONS.map((o) => [o.value, o])
) as Record<RsvpStatus, (typeof RSVP_STATUS_OPTIONS)[number]>

interface EditableStatusPillProps {
  status: RsvpStatus | null
  eventLabel?: string
  guestName?: string
  onChange: (status: RsvpStatus) => void
  disabled?: boolean
}

export default function EditableStatusPill({
  status,
  eventLabel,
  guestName,
  onChange,
  disabled = false,
}: EditableStatusPillProps) {
  const selectId = useId()

  if (!status) {
    return <span className="text-xs text-maroon/30">—</span>
  }

  const { label, dot, badge } = config[status]
  const ariaLabel = eventLabel
    ? `RSVP status for ${guestName ?? "guest"} at ${eventLabel}: ${label}`
    : `RSVP status: ${label}`

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor={selectId} className="sr-only">
        {ariaLabel}
      </label>
      <select
        id={selectId}
        value={status}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as RsvpStatus)}
        aria-label={ariaLabel}
        className={`min-h-[44px] cursor-pointer appearance-none rounded-full border py-0.5 pl-5 pr-7 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-maroon/20 disabled:cursor-not-allowed disabled:opacity-60 ${badge}`}
      >
        {RSVP_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className={`pointer-events-none absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${dot}`}
        aria-hidden="true"
      />
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-current opacity-50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

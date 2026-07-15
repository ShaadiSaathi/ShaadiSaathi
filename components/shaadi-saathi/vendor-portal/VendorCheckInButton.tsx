"use client"

import GoldButton from "@/components/shaadi-saathi/app/GoldButton"

interface VendorCheckInButtonProps {
  onCheckIn: () => void
  disabled?: boolean
  checkedIn?: boolean
  checkedInAt?: string
}

/** Confirm Arrival ✓ — vendor perspective check-in */
export default function VendorCheckInButton({
  onCheckIn,
  disabled,
  checkedIn,
  checkedInAt,
}: VendorCheckInButtonProps) {
  if (checkedIn && checkedInAt) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>
          Arrival confirmed ·{" "}
          {new Date(checkedInAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    )
  }

  return (
    <GoldButton onClick={onCheckIn} disabled={disabled} className="w-full sm:w-auto">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Confirm Arrival ✓
    </GoldButton>
  )
}

export function VendorGracePeriodBanner({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt)
  const formatted = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      <p className="font-medium">Check in before the grace period ends</p>
      <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80">
        Confirm your arrival by {formatted} to release your deposit and protect your reliability
        score.
      </p>
    </div>
  )
}

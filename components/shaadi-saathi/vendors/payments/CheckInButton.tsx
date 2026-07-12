"use client"

import { useRef, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import type { CheckInPhoto } from "@/lib/mockPayments"
import { MOCK_NOW } from "@/lib/mockPayments"
import CheckInPhotoDisplay from "@/components/shaadi-saathi/shared/CheckInPhotoDisplay"

interface CheckInButtonProps {
  onCheckIn: (photo: CheckInPhoto) => void
  disabled?: boolean
  checkedIn?: boolean
  checkedInAt?: string
  checkInPhoto?: CheckInPhoto
  /** Vendor-facing label variant */
  variant?: "family" | "vendor"
}

/** Check-in requires a setup photo before confirming arrival */
export default function CheckInButton({
  onCheckIn,
  disabled,
  checkedIn,
  checkedInAt,
  checkInPhoto,
  variant = "family",
}: CheckInButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingPhoto, setPendingPhoto] = useState<CheckInPhoto | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPhoto({
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      uploadedAt: MOCK_NOW.toISOString(),
    })
  }

  if (checkedIn && checkedInAt && checkInPhoto) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {variant === "vendor" ? "Arrival confirmed" : "Vendor arrived"} ·{" "}
            {new Date(checkedInAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        <CheckInPhotoDisplay photo={checkInPhoto} />
      </div>
    )
  }

  const label = variant === "vendor" ? "Confirm Arrival ✓" : "Vendor Arrived ✓"

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-maroon/70">
        Add a photo of the setup
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
        id="check-in-photo"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-ivory px-4 py-3 text-sm text-maroon/70 hover:border-gold/60 hover:bg-gold/5"
      >
        <svg className="h-5 w-5 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM4.5 19.5h15" />
        </svg>
        {pendingPhoto ? pendingPhoto.name : "Choose photo"}
      </button>
      {pendingPhoto && (
        <CheckInPhotoDisplay photo={pendingPhoto} compact />
      )}
      <GoldButton
        onClick={() => pendingPhoto && onCheckIn(pendingPhoto)}
        disabled={disabled || !pendingPhoto}
        className="w-full sm:w-auto"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {label}
      </GoldButton>
    </div>
  )
}

export function GracePeriodBanner({ endsAt }: { endsAt: string }) {
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
      <p className="font-medium">Waiting for vendor check-in</p>
      <p className="mt-0.5 text-xs text-amber-800/80">
        Grace period ends at {formatted}. If they don&apos;t arrive, we&apos;ll protect your
        deposit automatically.
      </p>
    </div>
  )
}

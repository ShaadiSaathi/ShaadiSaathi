"use client"

import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import type { RsvpStatus } from "@/lib/mockData"

interface ConfirmOverrideDialogProps {
  guestName: string
  eventName: string
  currentStatus: RsvpStatus
  newStatus: RsvpStatus
  onConfirm: () => void
  onCancel: () => void
}

const STATUS_LABELS: Record<RsvpStatus, string> = {
  pending: "pending",
  confirmed: "confirmed",
  declined: "declined",
  cancelled: "cancelled",
}

export default function ConfirmOverrideDialog({
  guestName,
  eventName,
  currentStatus,
  newStatus,
  onConfirm,
  onCancel,
}: ConfirmOverrideDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
      role="alertdialog"
      aria-labelledby="override-title"
      aria-describedby="override-desc"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl">
        <h2 id="override-title" className="font-display text-lg font-semibold text-maroon-dark">
          Change RSVP status?
        </h2>
        <p id="override-desc" className="mt-2 text-sm leading-relaxed text-maroon/70">
          <strong>{guestName}</strong> already set their status to{" "}
          <strong>{STATUS_LABELS[currentStatus]}</strong> for {eventName} via their invite
          link. Are you sure you want to change it to{" "}
          <strong>{STATUS_LABELS[newStatus]}</strong>?
        </p>
        <div className="mt-5 flex gap-3">
          <GoldButton type="button" onClick={onConfirm} className="flex-1">
            Yes, change it
          </GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </GoldButton>
        </div>
      </div>
    </div>
  )
}

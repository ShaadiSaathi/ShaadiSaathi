"use client"

import Button from "@/components/shaadi-saathi/ui/Button"
import Modal from "@/components/shaadi-saathi/ui/Modal"
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
    <Modal
      role="alertdialog"
      size="sm"
      titleId="override-title"
      descriptionId="override-desc"
      title="Change RSVP status?"
      description={`${guestName} already set their status to ${STATUS_LABELS[currentStatus]} for ${eventName} via their invite link. Are you sure you want to change it to ${STATUS_LABELS[newStatus]}?`}
      onClose={onCancel}
      footer={
        <div className="flex gap-3">
          <Button type="button" onClick={onConfirm} className="flex-1">
            Yes, change it
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      }
    />
  )
}

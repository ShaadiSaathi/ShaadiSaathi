"use client"

import { useRef, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { MOCK_NOW } from "@/lib/mockPayments"

interface QualityConcernFormProps {
  onSubmit: (data: { description: string; photoName?: string }) => void
  onClose: () => void
}

/** Family-only quick flag — faster than formal dispute */
export default function QualityConcernForm({ onSubmit, onClose }: QualityConcernFormProps) {
  const [description, setDescription] = useState("")
  const [photoName, setPhotoName] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon/40 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="quality-concern-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-white p-6 shadow-xl">
        <h2 id="quality-concern-title" className="font-display text-lg font-semibold text-maroon-dark">
          Something&apos;s wrong with the setup
        </h2>
        <p className="mt-1 text-sm text-maroon/60">
          This pauses deposit release and starts an expedited same-day review — faster than a
          formal dispute.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!description.trim()) return
            onSubmit({ description: description.trim(), photoName })
            onClose()
          }}
        >
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-line description — e.g. 'Only half the tables are set up'"
            className="w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-sm text-maroon-dark placeholder:text-maroon/40 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
            required
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-maroon/70 hover:text-maroon"
          >
            {photoName ? `Photo: ${photoName}` : "+ Add quick photo (optional)"}
          </button>
          <div className="flex gap-2 pt-2">
            <GoldButton type="submit">Report issue</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </GoldButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export function QualityConcernBadge() {
  return (
    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900">
      Quality concern — under review
    </span>
  )
}

export function QualityConcernCard({ description }: { description: string }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900">
      <p className="font-medium">Arrived — issue reported</p>
      <p className="mt-1 text-xs text-violet-800/90">{description}</p>
      <p className="mt-2 text-xs text-violet-700/80">
        Deposit release paused · Expedited review in progress
      </p>
    </div>
  )
}

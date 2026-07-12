"use client"

import { useState } from "react"
import type { DisputeCategory } from "@/lib/mockPayments"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"

interface DisputeFormProps {
  vendorName: string
  onSubmit: (data: {
    category: DisputeCategory
    description: string
    evidenceFileName?: string
  }) => void
  onClose: () => void
}

/** Simple dispute form — PLACEHOLDER for full resolution workflow */
export default function DisputeForm({ vendorName, onSubmit, onClose }: DisputeFormProps) {
  const [category, setCategory] = useState<DisputeCategory>("quality")
  const [description, setDescription] = useState("")
  const [evidenceFileName, setEvidenceFileName] = useState<string>()
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ category, description, evidenceFileName })
    setSubmitted(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="dispute-title"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl">
        {submitted ? (
          <DisputeUnderReviewCard vendorName={vendorName} onClose={onClose} />
        ) : (
          <>
            <h2 id="dispute-title" className="font-display text-xl font-semibold text-maroon-dark">
              Report an issue
            </h2>
            <p className="mt-1 text-sm text-maroon/60">
              Tell us what went wrong with {vendorName}. We&apos;ll review within 48 hours.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="dispute-category" className="block text-sm font-medium text-maroon/70">
                  Issue type
                </label>
                <select
                  id="dispute-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DisputeCategory)}
                  className="mt-1 w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                >
                  <option value="quality">Quality / Service issue</option>
                  <option value="other">Other</option>
                  <option value="no_show">No-show (usually automatic)</option>
                </select>
              </div>

              <div>
                <label htmlFor="dispute-description" className="block text-sm font-medium text-maroon/70">
                  What happened?
                </label>
                <textarea
                  id="dispute-description"
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in a few sentences..."
                  className="mt-1 w-full resize-none rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="dispute-evidence" className="block text-sm font-medium text-maroon/70">
                  Evidence (optional)
                </label>
                <input
                  id="dispute-evidence"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEvidenceFileName(e.target.files?.[0]?.name)}
                  className="mt-1 w-full text-sm text-maroon/60 file:mr-3 file:rounded-lg file:border-0 file:bg-gold/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-maroon-dark"
                />
                {/* PLACEHOLDER: upload to storage / Convex file API */}
              </div>

              <div className="flex gap-3 pt-2">
                <GoldButton type="submit" className="flex-1">
                  Submit dispute
                </GoldButton>
                <GoldButton type="button" variant="ghost" onClick={onClose} className="flex-1">
                  Cancel
                </GoldButton>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export function DisputeUnderReviewCard({
  vendorName,
  onClose,
}: {
  vendorName: string
  onClose?: () => void
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-maroon-dark">Dispute under review</h3>
      <p className="mt-3 text-sm leading-relaxed text-maroon/70">
        We&apos;ve received your report about {vendorName}. Our team will review it and get back
        to you within 48 hours. We&apos;re on your side.
      </p>
      {onClose && (
        <GoldButton onClick={onClose} className="mt-6 w-full">
          Close
        </GoldButton>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import type { Vendor } from "@/lib/mockVendors"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"

interface MessageModalProps {
  vendor: Vendor
  onClose: () => void
}

/** Mock contact modal — no real messaging backend */
export default function MessageModal({ vendor, onClose }: MessageModalProps) {
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 sm:items-center sm:p-4"
      role="dialog"
      aria-labelledby="message-modal-title"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gold/25 bg-ivory shadow-xl sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-maroon/50 transition-colors hover:bg-maroon/5 hover:text-maroon"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex shrink-0 justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-maroon/15" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {sent ? (
          <div className="text-center">
            <h2 id="message-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              Message sent
            </h2>
            <p className="mt-3 text-sm text-maroon/70">
              {/* PLACEHOLDER: connect to real messaging when backend exists */}
              Your message to {vendor.name} has been queued. They typically reply within a day.
            </p>
            <GoldButton onClick={onClose} className="mt-6 min-h-[44px] w-full">
              Close
            </GoldButton>
          </div>
        ) : (
          <>
            <h2 id="message-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              Message {vendor.name}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="vendor-message" className="block text-sm font-medium text-maroon/70">
                  Your message
                </label>
                <textarea
                  id="vendor-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi, we're planning our walima and would love to know..."
                  className="mt-1 w-full resize-none rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <GoldButton type="submit" className="min-h-[44px] flex-1">
                  Send
                </GoldButton>
                <GoldButton type="button" variant="ghost" onClick={onClose} className="min-h-[44px] flex-1">
                  Cancel
                </GoldButton>
              </div>
            </form>
          </>
        )}
        </div>
      </div>
    </div>
  )
}

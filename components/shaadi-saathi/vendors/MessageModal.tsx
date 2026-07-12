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
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="message-modal-title"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl">
        {sent ? (
          <div className="text-center">
            <h2 id="message-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              Message sent
            </h2>
            <p className="mt-3 text-sm text-maroon/70">
              {/* PLACEHOLDER: connect to real messaging when backend exists */}
              Your message to {vendor.name} has been queued. They typically reply within a day.
            </p>
            <GoldButton onClick={onClose} className="mt-6 w-full">
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
              <div className="flex gap-3">
                <GoldButton type="submit" className="flex-1">
                  Send
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

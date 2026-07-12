"use client"

import { useCallback, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { WEDDING, createGuestInviteUrl } from "@/lib/mockData"

interface InviteLinkModalProps {
  guestName: string
  inviteToken: string
  onClose: () => void
}

export default function InviteLinkModal({
  guestName,
  inviteToken,
  onClose,
}: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false)

  const inviteUrl =
    typeof window !== "undefined"
      ? createGuestInviteUrl(inviteToken, window.location.origin)
      : createGuestInviteUrl(inviteToken)

  const whatsappMessage = encodeURIComponent(
    `You're invited to ${WEDDING.couple}'s wedding celebrations! Please RSVP here: ${inviteUrl}`
  )
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input")
      input.value = inviteUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteUrl])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="invite-link-title"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="invite-link-title" className="font-display text-xl font-semibold text-maroon-dark">
          Send invite to {guestName}
        </h2>
        <p className="mt-1 text-sm text-maroon/60">
          Share this personal link so they can view their invitation and RSVP.
        </p>

        <div className="mt-4">
          <label htmlFor="invite-url" className="block text-xs font-medium text-maroon/50">
            Invite link
          </label>
          <input
            id="invite-url"
            type="text"
            readOnly
            value={inviteUrl}
            className="mt-1 w-full rounded-xl border border-gold/20 bg-white px-3 py-2.5 text-sm text-maroon-dark"
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <GoldButton type="button" onClick={handleCopy} className="flex-1">
            {copied ? "Copied!" : "Copy Link"}
          </GoldButton>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share via WhatsApp
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-maroon/50 hover:text-maroon"
        >
          Close
        </button>
      </div>
    </div>
  )
}

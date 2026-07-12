"use client"

import { useCallback, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { createWeddingInviteUrl } from "@/lib/mockData"

interface WeddingInviteLinkButtonProps {
  variant?: "button" | "link"
}

export default function WeddingInviteLinkButton({
  variant = "button",
}: WeddingInviteLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const inviteUrl =
    typeof window !== "undefined"
      ? createWeddingInviteUrl(window.location.origin)
      : createWeddingInviteUrl()

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      const input = document.createElement("input")
      input.value = inviteUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteUrl])

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-maroon hover:text-maroon-dark"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        {copied ? "Link copied!" : "Copy wedding invite link"}
      </button>
    )
  }

  return (
    <GoldButton type="button" variant="ghost" onClick={handleCopy}>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
      {copied ? "Copied!" : "Copy Wedding Invite Link"}
    </GoldButton>
  )
}

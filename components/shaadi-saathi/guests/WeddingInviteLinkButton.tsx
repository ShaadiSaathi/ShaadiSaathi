"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { WEDDING, createWeddingInviteUrl } from "@/lib/mockData"

interface WeddingInviteLinkButtonProps {
  variant?: "button" | "link"
}

export default function WeddingInviteLinkButton({
  variant = "button",
}: WeddingInviteLinkButtonProps) {
  const { weddingId: ctxWeddingId, loading: weddingLoading } = useWedding()
  const {
    weddingId: authWeddingId,
    authLoading,
    isFamilyLoggedIn,
    ensureFamilyWedding,
  } = useAuth()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const autoRepairAttempted = useRef(false)

  // Prefer auth/context wedding id; mock mode falls back to the demo wedding.
  const weddingId =
    ctxWeddingId ??
    authWeddingId ??
    (isFirebaseConfigured() ? null : WEDDING.id)

  const preparing =
    authLoading || (isFamilyLoggedIn && weddingLoading && !weddingId)

  const inviteUrl = weddingId
    ? createWeddingInviteUrl(
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
        weddingId
      )
    : ""

  useEffect(() => {
    if (!feedback) return
    const t = window.setTimeout(() => setFeedback(null), 3200)
    return () => window.clearTimeout(t)
  }, [feedback])

  // Soft repair: if the family session is live but weddingId never linked,
  // create/relink once so the copy button works without a manual refresh.
  useEffect(() => {
    if (!isFirebaseConfigured()) return
    if (!isFamilyLoggedIn || authLoading || weddingId) return
    if (autoRepairAttempted.current) return
    autoRepairAttempted.current = true
    let cancelled = false
    setBusy(true)
    void ensureFamilyWedding()
      .catch(() => {
        // Leave UI for the explicit generate/copy click path.
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, ensureFamilyWedding, isFamilyLoggedIn, weddingId])

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const input = document.createElement("input")
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    if (preparing || busy) return

    let id = weddingId
    let url = inviteUrl

    if (!id || !url) {
      try {
        setBusy(true)
        setFeedback("Generating invite link…")
        id = await ensureFamilyWedding()
        url = createWeddingInviteUrl(window.location.origin, id)
      } catch (err) {
        setFeedback(
          err instanceof Error
            ? err.message
            : "Couldn’t generate invite link — try again."
        )
        return
      } finally {
        setBusy(false)
      }
    }

    await copyText(url)
    setCopied(true)
    setFeedback(null)
    window.setTimeout(() => setCopied(false), 2000)
  }, [
    busy,
    copyText,
    ensureFamilyWedding,
    inviteUrl,
    preparing,
    weddingId,
  ])

  const label = preparing || busy
    ? weddingId
      ? "Preparing invite link…"
      : "Generating invite link…"
    : feedback
      ? feedback
      : copied
        ? variant === "link"
          ? "Link copied!"
          : "Copied!"
        : !weddingId
          ? variant === "link"
            ? "Generate wedding invite link"
            : "Generate Wedding Invite Link"
          : variant === "link"
            ? "Copy wedding invite link"
            : "Copy Wedding Invite Link"

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={preparing || busy}
        aria-busy={preparing || busy}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-maroon hover:text-maroon-dark disabled:cursor-wait disabled:opacity-60"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        {label}
      </button>
    )
  }

  return (
    <GoldButton
      type="button"
      variant="ghost"
      onClick={() => void handleCopy()}
      disabled={preparing || busy}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
      {label}
    </GoldButton>
  )
}

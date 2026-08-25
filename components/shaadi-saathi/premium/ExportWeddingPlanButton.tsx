"use client"

/**
 * Premium-gated control to download a branded wedding-plan PDF.
 */

import { useState } from "react"
import UpgradePromptBanner from "@/components/shaadi-saathi/premium/UpgradePromptBanner"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useEventDetail } from "@/components/shaadi-saathi/events/EventDetailContext"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import Button from "@/components/shaadi-saathi/ui/Button"
import { authenticatedFetch } from "@/lib/firebase/authenticated-fetch"
import { getCollaboratorRole } from "@/lib/collaborator-access"
import { EVENTS, type EventId } from "@/lib/mockData"

type Variant = "primary" | "secondary" | "ghost"

export default function ExportWeddingPlanButton({
  variant = "secondary",
  className = "",
}: {
  variant?: Variant
  className?: string
}) {
  const { isFamilyPremium } = usePremium()
  const { firebaseUser, familyUser } = useAuth()
  const { wedding } = useWedding()
  const eventDetail = useEventDetail()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const uid = firebaseUser?.uid ?? null
  const role = getCollaboratorRole(wedding, uid)
  const canExport = role === "owner" || role === "full"

  async function handleExport() {
    setError(null)
    if (!isFamilyPremium) {
      setShowUpgrade(true)
      return
    }
    if (!canExport) {
      setError(
        "Only the wedding owner or a full collaborator can export the wedding plan."
      )
      return
    }
    if (!firebaseUser) {
      setError("Sign in to export your wedding plan.")
      return
    }

    setBusy(true)
    try {
      const daySchedules: Partial<
        Record<EventId, Array<{ time: string; label: string }>>
      > = {}
      for (const event of EVENTS) {
        const timeline = eventDetail.getTimeline(event.id)
        if (timeline.length > 0) {
          daySchedules[event.id] = timeline.map((row) => ({
            time: row.time,
            label: row.label,
          }))
        }
      }

      const res = await authenticatedFetch("/api/wedding-plan/export", {
        method: "POST",
        body: JSON.stringify({ daySchedules }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Could not generate PDF")
      }

      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename =
        match?.[1] ??
        `shaadi-saathi-wedding-plan-${new Date().toISOString().slice(0, 10)}.pdf`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      {showUpgrade && !isFamilyPremium ? (
        <div className="mb-3">
          <UpgradePromptBanner
            message="Exporting your full wedding plan as a PDF is a Premium feature."
            onDismiss={() => setShowUpgrade(false)}
          />
        </div>
      ) : null}

      <Button
        type="button"
        variant={variant}
        disabled={busy}
        onClick={() => void handleExport()}
        aria-label="Export wedding plan as PDF"
      >
        {busy ? "Preparing PDF…" : "Export as PDF"}
      </Button>

      {error ? (
        <p className="mt-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {familyUser && !canExport && isFamilyPremium ? (
        <p className="mt-2 text-xs text-maroon/50">
          Ask the wedding owner or a full collaborator to export the plan.
        </p>
      ) : null}
    </div>
  )
}

"use client"

import { useState } from "react"
import WeddingPreferencesForm from "@/components/shaadi-saathi/wedding/WeddingPreferencesForm"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { updateWeddingPlanningPreferences } from "@/lib/firebase/weddings"
import type { WeddingPlanningPreferences } from "@/lib/wedding-preferences"

export default function WeddingPreferencesSettings() {
  const { weddingId, isFirebaseMode } = useAuth()
  const { wedding, loading } = useWedding()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isFirebaseMode) {
    return (
      <p className="mt-3 text-sm text-maroon/50">
        Planning preferences are saved when signed in with Firebase.
      </p>
    )
  }

  if (loading) {
    return <p className="mt-3 text-sm text-maroon/50">Loading…</p>
  }

  if (!weddingId) {
    return (
      <p className="mt-3 text-sm text-maroon/50">
        Finish wedding setup to save planning preferences.
      </p>
    )
  }

  async function handleSave(preferences: WeddingPlanningPreferences) {
    setError(null)
    setMessage(null)
    await updateWeddingPlanningPreferences(weddingId!, preferences)
    setMessage("Planning preferences saved.")
  }

  return (
    <div className="mt-4">
      <WeddingPreferencesForm
        compact
        initial={wedding?.planningPreferences}
        defaultWeddingDate={wedding?.firstEventDate}
        intro="These help Wedding AI tailor answers. All fields are optional — update anytime."
        submitLabel="Save preferences"
        onSubmit={handleSave}
      />
      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  )
}

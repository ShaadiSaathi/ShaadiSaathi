"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AuthSubmitButton from "./AuthSubmitButton"
import { useAuth } from "./AuthContext"
import { mockAuthDelay, validateRequired } from "./authValidation"
import WeddingPreferencesForm from "@/components/shaadi-saathi/wedding/WeddingPreferencesForm"
import { updateWeddingPlanningPreferences } from "@/lib/firebase/weddings"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import type { WeddingPlanningPreferences } from "@/lib/wedding-preferences"
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_ERROR_CLASS } from "@/lib/auth/auth-form-styles"

/** Family wedding setup after signup OTP, then optional planning preferences */
export default function FamilyOnboardingStep({
  onPhaseChange,
}: {
  onPhaseChange?: (phase: "wedding" | "preferences") => void
}) {
  const router = useRouter()
  const { pending, completeFamilyOnboarding, isFamilyLoggedIn, pendingCollaboratorInvites } =
    useAuth()
  const [phase, setPhase] = useState<"wedding" | "preferences">("wedding")
  const [weddingName, setWeddingName] = useState("")
  const [firstEventDate, setFirstEventDate] = useState("")
  const [createdWeddingId, setCreatedWeddingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ weddingName?: string; date?: string }>({})
  const completingRef = useRef(false)

  useEffect(() => {
    if (phase === "preferences") return
    if (completingRef.current || isFamilyLoggedIn) return
    if (!pending || pending.flow !== "family-signup") {
      router.replace("/signup")
      return
    }
    if (pendingCollaboratorInvites.length > 0) {
      router.replace("/signup/join")
    }
  }, [phase, pending, isFamilyLoggedIn, router, pendingCollaboratorInvites.length])

  if (
    phase === "wedding" &&
    !completingRef.current &&
    !isFamilyLoggedIn &&
    (!pending || pending.flow !== "family-signup")
  ) {
    return null
  }

  async function finishToDashboard() {
    completingRef.current = true
    router.push("/dashboard")
  }

  async function handleWeddingSubmit(e: React.FormEvent) {
    e.preventDefault()
    const weddingErr = validateRequired(weddingName, "Wedding name")
    const dateErr = validateRequired(firstEventDate, "First event date")
    setErrors({
      weddingName: weddingErr ?? undefined,
      date: dateErr ?? undefined,
    })
    setSubmitError(null)
    if (weddingErr || dateErr) return

    setLoading(true)
    completingRef.current = true
    try {
      await mockAuthDelay()
      const id = await completeFamilyOnboarding(weddingName, firstEventDate)
      setCreatedWeddingId(id)
      setPhase("preferences")
      onPhaseChange?.("preferences")
      setLoading(false)
      completingRef.current = false
    } catch (err) {
      completingRef.current = false
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Couldn’t finish setup. Please try again."
      )
      setLoading(false)
    }
  }

  async function savePreferences(preferences: WeddingPlanningPreferences) {
    if (isFirebaseConfigured() && createdWeddingId) {
      await updateWeddingPlanningPreferences(createdWeddingId, preferences)
    }
    await finishToDashboard()
  }

  const inputClass = AUTH_INPUT_CLASS

  if (phase === "preferences") {
    return (
      <WeddingPreferencesForm
        defaultWeddingDate={firstEventDate}
        intro="Optional — helps your Wedding AI assistant tailor answers from your first question. You can change these anytime in Settings."
        submitLabel="Save & enter dashboard"
        onSubmit={savePreferences}
        onSkip={finishToDashboard}
      />
    )
  }

  return (
    <form onSubmit={handleWeddingSubmit} className="space-y-5">
      <p className="text-sm leading-relaxed text-maroon/60">
        Welcome, <strong>{pending?.familyName}</strong>! Let&apos;s set up your wedding space.
      </p>

      <div>
        <label htmlFor="wedding-name" className={AUTH_LABEL_CLASS}>
          What should we call your wedding?
        </label>
        <input
          id="wedding-name"
          type="text"
          value={weddingName}
          onChange={(e) => setWeddingName(e.target.value)}
          placeholder="e.g. Ayesha & Bilal's Wedding"
          className={inputClass}
          aria-invalid={!!errors.weddingName}
          aria-describedby={errors.weddingName ? "wedding-name-error" : undefined}
        />
        {errors.weddingName && (
          <p id="wedding-name-error" className={AUTH_ERROR_CLASS} role="alert">
            {errors.weddingName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="first-event-date" className={AUTH_LABEL_CLASS}>
          When&apos;s the first event?
        </label>
        <input
          id="first-event-date"
          type="date"
          value={firstEventDate}
          onChange={(e) => setFirstEventDate(e.target.value)}
          className={inputClass}
          aria-invalid={!!errors.date}
          aria-describedby={errors.date ? "first-event-error" : undefined}
        />
        {errors.date && (
          <p id="first-event-error" className={AUTH_ERROR_CLASS} role="alert">
            {errors.date}
          </p>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-rose-600" role="alert">
          {submitError}
        </p>
      )}

      <AuthSubmitButton loading={loading}>Continue</AuthSubmitButton>
    </form>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AuthSubmitButton from "./AuthSubmitButton"
import { useAuth } from "./AuthContext"
import { mockAuthDelay, validateRequired } from "./authValidation"

/** One-screen family wedding setup after signup OTP */
export default function FamilyOnboardingStep() {
  const router = useRouter()
  const { pending, completeFamilyOnboarding, isFamilyLoggedIn, pendingCollaboratorInvites } = useAuth()
  const [weddingName, setWeddingName] = useState("")
  const [firstEventDate, setFirstEventDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ weddingName?: string; date?: string }>({})
  // Once the user has submitted onboarding we are navigating to the dashboard.
  // Completing onboarding clears `pending`, which must NOT be misread as "the
  // signup session vanished" and bounce the now-signed-in user back to /signup.
  const completingRef = useRef(false)

  useEffect(() => {
    if (completingRef.current || isFamilyLoggedIn) return
    if (!pending || pending.flow !== "family-signup") {
      router.replace("/signup")
      return
    }
    if (pendingCollaboratorInvites.length > 0) {
      router.replace("/signup/join")
    }
  }, [pending, isFamilyLoggedIn, router, pendingCollaboratorInvites.length])

  if (
    !completingRef.current &&
    !isFamilyLoggedIn &&
    (!pending || pending.flow !== "family-signup")
  ) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
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
    // Mark completing BEFORE awaiting so the guard effect that reacts to
    // `pending` being cleared inside completeFamilyOnboarding can't redirect
    // us back to /signup mid-flight.
    completingRef.current = true
    try {
      await mockAuthDelay()
      // Must finish creating the wedding + writing users.weddingId before the
      // dashboard mounts — otherwise the invite link stays "not ready".
      await completeFamilyOnboarding(weddingName, firstEventDate)
      router.push("/dashboard")
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

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm leading-relaxed text-maroon/60">
        Welcome, <strong>{pending?.familyName}</strong>! Let&apos;s set up your wedding space.
      </p>

      <div>
        <label htmlFor="wedding-name" className="mb-1 block text-sm font-medium text-maroon/70">
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
          <p id="wedding-name-error" className="mt-1 text-xs text-rose-600" role="alert">
            {errors.weddingName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="first-event-date" className="mb-1 block text-sm font-medium text-maroon/70">
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
          <p id="first-event-error" className="mt-1 text-xs text-rose-600" role="alert">
            {errors.date}
          </p>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-rose-600" role="alert">
          {submitError}
        </p>
      )}

      <AuthSubmitButton loading={loading}>Enter my dashboard</AuthSubmitButton>
    </form>
  )
}

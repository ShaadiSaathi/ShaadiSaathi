"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AuthSubmitButton from "./AuthSubmitButton"
import { useAuth } from "./AuthContext"
import { mockAuthDelay, validateRequired } from "./authValidation"

/** One-screen family wedding setup after signup OTP */
export default function FamilyOnboardingStep() {
  const router = useRouter()
  const { pending, completeFamilyOnboarding } = useAuth()
  const [weddingName, setWeddingName] = useState("")
  const [firstEventDate, setFirstEventDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ weddingName?: string; date?: string }>({})

  useEffect(() => {
    if (!pending || pending.flow !== "family-signup") {
      router.replace("/signup")
    }
  }, [pending, router])

  if (!pending || pending.flow !== "family-signup") {
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
    if (weddingErr || dateErr) return

    setLoading(true)
    await mockAuthDelay()
    completeFamilyOnboarding(weddingName, firstEventDate)
    router.push("/dashboard")
  }

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm leading-relaxed text-maroon/60">
        Welcome, <strong>{pending.familyName}</strong>! Let&apos;s set up your wedding space.
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

      <AuthSubmitButton loading={loading}>Enter my dashboard</AuthSubmitButton>
    </form>
  )
}

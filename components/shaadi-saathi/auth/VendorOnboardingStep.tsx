"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AuthSubmitButton from "./AuthSubmitButton"
import { useAuth } from "./AuthContext"
import { mockAuthDelay, validateRequired } from "./authValidation"

interface VendorOnboardingStepProps {
  onComplete?: (bio: string, coverPhotoPreview?: string) => void
}

/** Short vendor profile setup after signup OTP */
export default function VendorOnboardingStep({ onComplete }: VendorOnboardingStepProps) {
  const router = useRouter()
  const { pending, completeVendorOnboarding } = useAuth()
  const [bio, setBio] = useState("")
  const [coverPreview, setCoverPreview] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pending || pending.flow !== "vendor-signup") {
      router.replace("/vendor/signup")
    }
  }, [pending, router])

  if (!pending || pending.flow !== "vendor-signup") {
    return null
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCoverPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateRequired(bio, "Business bio")
    setBioError(err)
    if (err) return

    setLoading(true)
    await mockAuthDelay()
    if (onComplete) {
      onComplete(bio, coverPreview)
    } else {
      completeVendorOnboarding(bio, coverPreview)
      router.push("/vendor/dashboard")
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-maroon/60">
        Almost there! Tell families a bit about{" "}
        <strong>{pending.vendor?.businessName}</strong>.
      </p>

      <div>
        <label htmlFor="vendor-bio" className="mb-1 block text-sm font-medium text-maroon/70">
          Business bio
        </label>
        <textarea
          id="vendor-bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Describe your services, experience, and what makes your business special…"
          className={inputClass}
          aria-invalid={!!bioError}
          aria-describedby={bioError ? "vendor-bio-error" : undefined}
        />
        {bioError && (
          <p id="vendor-bio-error" className="mt-1 text-xs text-rose-600" role="alert">
            {bioError}
          </p>
        )}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-maroon/70">Cover photo</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/30 bg-ivory/50 px-4 py-8 text-sm text-maroon/50 transition-colors hover:border-gold/50 hover:bg-ivory"
        >
          {coverPreview ? (
            <div
              className="h-24 w-full rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${coverPreview})` }}
              role="img"
              aria-label="Cover photo preview"
            />
          ) : (
            <>
              <svg className="h-8 w-8 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              Upload cover photo (optional)
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="sr-only"
          aria-label="Upload cover photo"
        />
      </div>

      <AuthSubmitButton loading={loading}>Go to vendor dashboard</AuthSubmitButton>
    </form>
  )
}

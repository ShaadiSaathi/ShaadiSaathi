"use client"

import { useEffect, useRef, useState } from "react"
import AuthSubmitButton from "@/components/shaadi-saathi/auth/AuthSubmitButton"
import { validateRequired } from "@/components/shaadi-saathi/auth/authValidation"
import type { EventId } from "@/lib/mockData"
import { EVENTS } from "@/lib/mockData"
import {
  CITIES,
  VENDOR_CATEGORIES,
  type VendorCategoryId,
} from "@/lib/mockVendors"
import {
  isFirebaseStorageConfigured,
} from "@/lib/firebase/config"
import {
  uploadVendorPortfolioImage,
  VENDOR_IMAGE_ACCEPT,
  VENDOR_PORTFOLIO_MAX_IMAGES,
} from "@/lib/firebase/vendor-upload"
import { isValidCnicInput } from "@/lib/firebase/vendor-verification"

export type VendorOnboardingFormState = {
  businessName: string
  categoryId: VendorCategoryId
  city: string
  phone: string
  email: string
  photoUrls: string[]
  coverPhotoUrl: string
  bio: string
  startingPrice: string
  pricingNotes: string
  availableFor: EventId[]
  cnic: string
}

export const EMPTY_ONBOARDING_FORM: VendorOnboardingFormState = {
  businessName: "",
  categoryId: "catering",
  city: "Lahore",
  phone: "",
  email: "",
  photoUrls: [],
  coverPhotoUrl: "",
  bio: "",
  startingPrice: "",
  pricingNotes: "",
  availableFor: ["mehndi", "baraat", "walima"],
  cnic: "",
}

const STEP_LABELS = [
  "Business info",
  "Portfolio",
  "Services",
  "Review & submit",
] as const

type VendorOnboardingWizardProps = {
  initial: VendorOnboardingFormState
  initialStep?: number
  /** When true, form is editing an already-submitted pending profile */
  editMode?: boolean
  vendorId: string | null
  uid: string | null
  /** Persist draft fields after each step (except final submit) */
  onSaveDraft: (
    data: VendorOnboardingFormState,
    step: number
  ) => Promise<string | void>
  onSubmit: (data: VendorOnboardingFormState) => Promise<void>
}

const inputClass =
  "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

export default function VendorOnboardingWizard({
  initial,
  initialStep = 1,
  editMode = false,
  vendorId,
  uid,
  onSaveDraft,
  onSubmit,
}: VendorOnboardingWizardProps) {
  const [step, setStep] = useState(Math.min(4, Math.max(1, initialStep)))
  const [form, setForm] = useState<VendorOnboardingFormState>(initial)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  function update<K extends keyof VendorOnboardingFormState>(
    key: K,
    value: VendorOnboardingFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleEvent(eventId: EventId) {
    setForm((prev) => {
      const has = prev.availableFor.includes(eventId)
      const next = has
        ? prev.availableFor.filter((e) => e !== eventId)
        : [...prev.availableFor, eventId]
      return { ...prev, availableFor: next }
    })
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      return (
        validateRequired(form.businessName, "Business name") ||
        validateRequired(form.city, "City") ||
        validateRequired(form.phone, "Phone")
      )
    }
    if (current === 2) {
      if (form.photoUrls.length < 1) {
        return "Upload at least one photo of your past work"
      }
      return null
    }
    if (current === 3) {
      const bioErr = validateRequired(form.bio, "Description")
      if (bioErr) return bioErr
      if (form.bio.trim().length < 20) {
        return "Description should be at least 20 characters"
      }
      const price = Number(form.startingPrice)
      if (!Number.isFinite(price) || price < 0) {
        return "Enter a starting price (PKR)"
      }
      if (form.availableFor.length < 1) {
        return "Select at least one event type"
      }
      return null
    }
    if (current === 4) {
      if (!isValidCnicInput(form.cnic)) {
        return "Enter a valid CNIC / ID number (5–20 characters)"
      }
      return null
    }
    return null
  }

  async function handleContinue() {
    const err = validateStep(step)
    setError(err)
    if (err) return

    setLoading(true)
    setError(null)
    try {
      await onSaveDraft(form, step)
      setStep((s) => Math.min(4, s + 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleBack() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateStep(4) || validateStep(1) || validateStep(2) || validateStep(3)
    setError(err)
    if (err) return

    setLoading(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err2) {
      setError(
        err2 instanceof Error ? err2.message : "Could not submit for review."
      )
      setLoading(false)
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    if (!vendorId || !uid) {
      setError("Finish step 1 first so we can save your portfolio.")
      return
    }
    if (!isFirebaseStorageConfigured()) {
      setError("Image uploads need Firebase Storage configuration.")
      return
    }

    const remaining = VENDOR_PORTFOLIO_MAX_IMAGES - form.photoUrls.length
    if (remaining <= 0) {
      setError(`You can upload up to ${VENDOR_PORTFOLIO_MAX_IMAGES} photos.`)
      return
    }

    setUploading(true)
    setError(null)
    try {
      const selected = Array.from(files).slice(0, remaining)
      const urls: string[] = []
      for (const file of selected) {
        const url = await uploadVendorPortfolioImage({
          vendorId,
          uid,
          file,
        })
        urls.push(url)
      }
      setForm((prev) => {
        const photoUrls = [...prev.photoUrls, ...urls].slice(
          0,
          VENDOR_PORTFOLIO_MAX_IMAGES
        )
        return {
          ...prev,
          photoUrls,
          coverPhotoUrl: prev.coverPhotoUrl || photoUrls[0] || "",
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function removePhoto(url: string) {
    setForm((prev) => {
      const photoUrls = prev.photoUrls.filter((u) => u !== url)
      return {
        ...prev,
        photoUrls,
        coverPhotoUrl:
          prev.coverPhotoUrl === url ? photoUrls[0] || "" : prev.coverPhotoUrl,
      }
    })
  }

  const categoryLabel =
    VENDOR_CATEGORIES.find((c) => c.id === form.categoryId)?.label ??
    form.categoryId

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-maroon/45">
          Step {step} of 4
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${
                i + 1 <= step ? "bg-maroon" : "bg-gold/25"
              }`}
              title={label}
            />
          ))}
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold text-maroon-dark">
          {STEP_LABELS[step - 1]}
        </h2>
        {editMode ? (
          <p className="mt-1 text-sm text-maroon/60">
            Your submission is under review. You can update details anytime —
            admins will see the latest version.
          </p>
        ) : null}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="ob-business" className="mb-1 block text-sm font-medium text-maroon/70">
              Business name
            </label>
            <input
              id="ob-business"
              className={inputClass}
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ob-category" className="mb-1 block text-sm font-medium text-maroon/70">
              Category
            </label>
            <select
              id="ob-category"
              className={inputClass}
              value={form.categoryId}
              onChange={(e) =>
                update("categoryId", e.target.value as VendorCategoryId)
              }
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ob-city" className="mb-1 block text-sm font-medium text-maroon/70">
              Service area / city
            </label>
            <select
              id="ob-city"
              className={inputClass}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ob-phone" className="mb-1 block text-sm font-medium text-maroon/70">
              Contact phone
            </label>
            <input
              id="ob-phone"
              className={inputClass}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="ob-email" className="mb-1 block text-sm font-medium text-maroon/70">
              Contact email <span className="font-normal text-maroon/40">(optional)</span>
            </label>
            <input
              id="ob-email"
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-maroon/60">
            Upload photos of past work so families can see your style. Up to{" "}
            {VENDOR_PORTFOLIO_MAX_IMAGES} images.
          </p>
          <button
            type="button"
            disabled={uploading || !vendorId}
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/30 bg-ivory/50 px-4 py-8 text-sm text-maroon/50 transition-colors hover:border-gold/50 hover:bg-ivory disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Add portfolio photos"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={VENDOR_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => void handleUpload(e.target.files)}
          />
          {form.photoUrls.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {form.photoUrls.map((url) => (
                <li key={url} className="relative overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Portfolio"
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute right-2 top-2 rounded-full bg-maroon/90 px-2 py-0.5 text-xs text-ivory"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="ob-price" className="mb-1 block text-sm font-medium text-maroon/70">
              Starting price (PKR)
            </label>
            <input
              id="ob-price"
              type="number"
              min={0}
              step={1000}
              className={inputClass}
              value={form.startingPrice}
              onChange={(e) => update("startingPrice", e.target.value)}
              placeholder="e.g. 80000"
            />
          </div>
          <div>
            <label htmlFor="ob-pricing-notes" className="mb-1 block text-sm font-medium text-maroon/70">
              Pricing structure <span className="font-normal text-maroon/40">(optional)</span>
            </label>
            <textarea
              id="ob-pricing-notes"
              rows={2}
              className={inputClass}
              value={form.pricingNotes}
              onChange={(e) => update("pricingNotes", e.target.value)}
              placeholder="e.g. Packages from 80k, or per-head catering from 2,500…"
            />
          </div>
          <div>
            <label htmlFor="ob-bio" className="mb-1 block text-sm font-medium text-maroon/70">
              Description
            </label>
            <textarea
              id="ob-bio"
              rows={4}
              className={inputClass}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Describe your services, experience, and what makes your business special…"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-maroon/70">
              Event types you cover
            </legend>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((ev) => {
                const checked = form.availableFor.includes(ev.id)
                return (
                  <label
                    key={ev.id}
                    className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      checked
                        ? "border-maroon bg-maroon/8 text-maroon-dark"
                        : "border-gold/25 bg-ivory text-maroon/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleEvent(ev.id)}
                    />
                    {ev.name}
                  </label>
                )
              })}
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === 4 ? (
        <form onSubmit={(e) => void handleFinalSubmit(e)} className="space-y-5">
          <div className="space-y-3 rounded-xl border border-gold/25 bg-ivory/40 p-4 text-sm text-maroon-dark">
            <p>
              <span className="text-maroon/50">Business</span>
              <br />
              <strong>{form.businessName}</strong> · {categoryLabel} · {form.city}
            </p>
            <p>
              <span className="text-maroon/50">Contact</span>
              <br />
              {form.phone}
              {form.email ? ` · ${form.email}` : ""}
            </p>
            <p>
              <span className="text-maroon/50">Portfolio</span>
              <br />
              {form.photoUrls.length} photo{form.photoUrls.length === 1 ? "" : "s"}
            </p>
            <p>
              <span className="text-maroon/50">Services</span>
              <br />
              From PKR {Number(form.startingPrice || 0).toLocaleString()}
              {form.pricingNotes ? ` — ${form.pricingNotes}` : ""}
              <br />
              Events:{" "}
              {form.availableFor
                .map((id) => EVENTS.find((e) => e.id === id)?.name ?? id)
                .join(", ")}
            </p>
            <p className="leading-relaxed text-maroon/80">{form.bio}</p>
          </div>

          <div>
            <label htmlFor="ob-cnic" className="mb-1 block text-sm font-medium text-maroon/70">
              CNIC / ID number
            </label>
            <p className="mb-2 text-xs text-maroon/50">
              Required for admin review before you can receive deposits or payouts.
            </p>
            <input
              id="ob-cnic"
              className={inputClass}
              value={form.cnic}
              onChange={(e) => update("cnic", e.target.value)}
              placeholder="e.g. 35202-1234567-1"
              autoComplete="off"
            />
          </div>

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleBack()}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-gold/30 px-4 text-sm font-semibold text-maroon"
            >
              Back
            </button>
            <div className="flex-1">
              <AuthSubmitButton loading={loading}>
                {editMode ? "Update & keep pending" : "Submit for review"}
              </AuthSubmitButton>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => void handleBack()}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-gold/30 px-4 text-sm font-semibold text-maroon"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              disabled={loading || uploading}
              onClick={() => void handleContinue()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-maroon px-4 text-sm font-semibold text-ivory disabled:opacity-60"
            >
              {loading ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

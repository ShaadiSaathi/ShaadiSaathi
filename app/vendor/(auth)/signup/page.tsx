"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import AuthSubmitButton from "@/components/shaadi-saathi/auth/AuthSubmitButton"
import PhoneInput from "@/components/shaadi-saathi/auth/PhoneInput"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import {
  isValidPakistanPhone,
  mockAuthDelay,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
} from "@/components/shaadi-saathi/auth/authValidation"
import { CITIES, VENDOR_CATEGORIES, type VendorCategoryId } from "@/lib/mockVendors"

export default function VendorSignupPage() {
  const router = useRouter()
  const { startVendorSignup } = useAuth()
  const [businessName, setBusinessName] = useState("")
  const [categoryId, setCategoryId] = useState<VendorCategoryId>("catering")
  const [city, setCity] = useState("Lahore")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = {
      business: validateRequired(businessName, "Business name"),
      phone: isValidPakistanPhone(phone)
        ? null
        : "Enter a valid 10-digit mobile number starting with 3",
      password: validatePassword(password),
      confirm: validatePasswordMatch(password, confirmPassword),
      terms: agreed ? null : "Please accept the Vendor Terms & Privacy Policy",
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setLoading(true)
    await mockAuthDelay()
    startVendorSignup({
      businessName: businessName.trim(),
      categoryId,
      city: city.trim(),
      phone,
      password,
    })
    router.push("/vendor/signup/verify")
  }

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <AuthCard
      variant="vendor"
      badge="Vendor portal"
      title="List your business"
      subtitle="Join families planning mehndi, baraat, and walima across Pakistan."
      footer={
        <p className="text-center text-sm text-maroon/60">
          Already listed?{" "}
          <Link href="/vendor/login" className="font-semibold text-maroon hover:text-gold-dark">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Vendor signup">
        <div>
          <label htmlFor="business-name" className="mb-1 block text-sm font-medium text-maroon/70">
            Business name
          </label>
          <input
            id="business-name"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.business}
            aria-describedby={errors.business ? "business-name-error" : undefined}
          />
          {errors.business && (
            <p id="business-name-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.business}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="vendor-category" className="mb-1 block text-sm font-medium text-maroon/70">
            Category
          </label>
          <select
            id="vendor-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as VendorCategoryId)}
            className={inputClass}
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vendor-city" className="mb-1 block text-sm font-medium text-maroon/70">
            City
          </label>
          <select
            id="vendor-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <PhoneInput id="vendor-signup-phone" value={phone} onChange={setPhone} error={errors.phone} />

        <div>
          <label htmlFor="vendor-password" className="mb-1 block text-sm font-medium text-maroon/70">
            Password
          </label>
          <input
            id="vendor-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "vendor-password-error" : undefined}
          />
          {errors.password && (
            <p id="vendor-password-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="vendor-confirm" className="mb-1 block text-sm font-medium text-maroon/70">
            Confirm password
          </label>
          <input
            id="vendor-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "vendor-confirm-error" : undefined}
          />
          {errors.confirm && (
            <p id="vendor-confirm-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.confirm}
            </p>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-maroon/70">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded border-gold/30 text-maroon focus:ring-maroon/20"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-maroon hover:underline">
              Vendor Terms
            </Link>{" "}
            &{" "}
            <Link href="/privacy" className="font-medium text-maroon hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-rose-600" role="alert">
            {errors.terms}
          </p>
        )}

        <AuthSubmitButton loading={loading}>List Your Business</AuthSubmitButton>
      </form>
    </AuthCard>
  )
}

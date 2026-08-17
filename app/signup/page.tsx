"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import AuthDivider from "@/components/shaadi-saathi/auth/AuthDivider"
import AuthSubmitButton from "@/components/shaadi-saathi/auth/AuthSubmitButton"
import GoogleAuthButton from "@/components/shaadi-saathi/auth/GoogleAuthButton"
import PhoneInput from "@/components/shaadi-saathi/auth/PhoneInput"
import { isValidPhoneNumber } from "react-phone-number-input"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import {
  mockAuthDelay,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
} from "@/components/shaadi-saathi/auth/authValidation"
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_ERROR_CLASS } from "@/lib/auth/auth-form-styles"

export default function FamilySignupPage() {
  const router = useRouter()
  const { startFamilySignup, loginWithGoogle } = useAuth()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = {
      name: validateRequired(name, "Full name"),
      phone: isValidPhoneNumber(phone) ? null : "Please enter a valid phone number",
      password: validatePassword(password),
      confirm: validatePasswordMatch(password, confirmPassword),
      terms: agreed ? null : "Please accept the Terms & Privacy Policy",
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setLoading(true)
    await mockAuthDelay()
    startFamilySignup({ name, phone, password })
    router.push("/signup/verify")
  }

  async function handleGoogle() {
    setLoading(true)
    await mockAuthDelay(600)
    loginWithGoogle("family")
    router.push("/dashboard")
  }

  const inputClass = AUTH_INPUT_CLASS

  return (
    <AuthCard
      premium
      progress={{ step: 1, total: 4 }}
      title="Create your account"
      subtitle="Start planning your shaadi in one shared space."
      footer={
        <p className="text-center text-sm text-maroon/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-maroon hover:text-gold-dark">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-label="Family signup">
        <div>
          <label htmlFor="signup-name" className={AUTH_LABEL_CLASS}>
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "signup-name-error" : undefined}
          />
          {errors.name && (
            <p id="signup-name-error" className={AUTH_ERROR_CLASS} role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <PhoneInput id="signup-phone" value={phone} onChange={setPhone} error={errors.phone} />

        <div>
          <label htmlFor="signup-password" className={AUTH_LABEL_CLASS}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "signup-password-error" : undefined}
          />
          {errors.password && (
            <p id="signup-password-error" className={AUTH_ERROR_CLASS} role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-confirm" className={AUTH_LABEL_CLASS}>
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "signup-confirm-error" : undefined}
          />
          {errors.confirm && (
            <p id="signup-confirm-error" className={AUTH_ERROR_CLASS} role="alert">
              {errors.confirm}
            </p>
          )}
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-2 text-sm leading-relaxed text-maroon/70">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-gold/30 text-maroon focus:ring-maroon/20"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-maroon hover:underline">
              Terms
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

        <AuthSubmitButton loading={loading}>Create Account</AuthSubmitButton>
      </form>

      <AuthDivider />
      <GoogleAuthButton onSuccess={handleGoogle} disabled={loading} />
    </AuthCard>
  )
}

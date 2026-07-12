"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import AuthDivider from "@/components/shaadi-saathi/auth/AuthDivider"
import AuthSubmitButton from "@/components/shaadi-saathi/auth/AuthSubmitButton"
import GoogleAuthButton from "@/components/shaadi-saathi/auth/GoogleAuthButton"
import PhoneInput from "@/components/shaadi-saathi/auth/PhoneInput"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import {
  isValidPakistanPhone,
  mockAuthDelay,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
} from "@/components/shaadi-saathi/auth/authValidation"

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
      phone: isValidPakistanPhone(phone)
        ? null
        : "Enter a valid 10-digit mobile number starting with 3",
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

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <AuthCard
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
      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Family signup">
        <div>
          <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-maroon/70">
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
            <p id="signup-name-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <PhoneInput id="signup-phone" value={phone} onChange={setPhone} error={errors.phone} />

        <div>
          <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-maroon/70">
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
            <p id="signup-password-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-confirm" className="mb-1 block text-sm font-medium text-maroon/70">
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
            <p id="signup-confirm-error" className="mt-1 text-xs text-rose-600" role="alert">
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

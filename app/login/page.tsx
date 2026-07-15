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
} from "@/components/shaadi-saathi/auth/authValidation"

export default function FamilyLoginPage() {
  const router = useRouter()
  const { loginFamily, loginWithGoogle, loginSuccessMessage, setLoginSuccessMessage } = useAuth()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const phoneErr = isValidPakistanPhone(phone)
      ? null
      : "Enter a valid 10-digit mobile number starting with 3"
    const passErr = validatePassword(password)
    setErrors({ phone: phoneErr ?? undefined, password: passErr ?? undefined })
    if (phoneErr || passErr) return

    setLoading(true)
    await mockAuthDelay()
    setLoginSuccessMessage(null)
    // Always go through real phone verification before reaching the dashboard.
    loginFamily(phone)
    router.push("/login/verify")
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
      title="Welcome back"
      subtitle="Log in to manage your wedding plans."
      footer={
        <p className="text-center text-sm text-maroon/60">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-maroon hover:text-gold-dark">
            Create an account
          </Link>
        </p>
      }
    >
      {loginSuccessMessage && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-800" role="status">
          {loginSuccessMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" aria-label="Family login">
        <PhoneInput id="login-phone" value={phone} onChange={setPhone} error={errors.phone} />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-maroon/70">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-[44px] items-center text-xs font-medium text-maroon/50 hover:text-maroon lg:min-h-0"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "login-password-error" : undefined}
          />
          {errors.password && (
            <p id="login-password-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <AuthSubmitButton loading={loading}>Log In</AuthSubmitButton>
      </form>

      <AuthDivider />
      <GoogleAuthButton onSuccess={handleGoogle} disabled={loading} />
    </AuthCard>
  )
}

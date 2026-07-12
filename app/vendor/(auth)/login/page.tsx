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
} from "@/components/shaadi-saathi/auth/authValidation"

export default function VendorLoginPage() {
  const router = useRouter()
  const { loginVendor, loginSuccessMessage, setLoginSuccessMessage } = useAuth()
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
    loginVendor(phone)
    router.push("/vendor/dashboard")
  }

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <AuthCard
      variant="vendor"
      badge="Vendor portal"
      title="Welcome back"
      subtitle="Sign in to manage bookings, jobs, and earnings."
      footer={
        <p className="text-center text-sm text-maroon/60">
          New vendor?{" "}
          <Link href="/vendor/signup" className="font-semibold text-maroon hover:text-gold-dark">
            List your business
          </Link>
        </p>
      }
    >
      {loginSuccessMessage && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {loginSuccessMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Vendor login">
        <PhoneInput id="vendor-login-phone" value={phone} onChange={setPhone} error={errors.phone} />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="vendor-login-password" className="text-sm font-medium text-maroon/70">
              Password
            </label>
            <Link
              href="/vendor/forgot-password"
              className="text-xs font-medium text-maroon/50 hover:text-maroon"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="vendor-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "vendor-login-password-error" : undefined}
          />
          {errors.password && (
            <p id="vendor-login-password-error" className="mt-1 text-xs text-rose-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <AuthSubmitButton loading={loading}>Log In</AuthSubmitButton>
      </form>
    </AuthCard>
  )
}

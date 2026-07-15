"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import AuthCard from "./AuthCard"
import AuthSubmitButton from "./AuthSubmitButton"
import OtpVerification from "./OtpVerification"
import PhoneInput from "./PhoneInput"
import { useAuth } from "./AuthContext"
import {
  isValidPakistanPhone,
  mockAuthDelay,
  validatePassword,
  validatePasswordMatch,
} from "./authValidation"

type Step = "phone" | "otp" | "new-password"

interface ForgotPasswordFlowProps {
  variant: "family" | "vendor"
}

/** Shared forgot-password flow: phone → OTP → new password */
export default function ForgotPasswordFlow({ variant }: ForgotPasswordFlowProps) {
  const router = useRouter()
  const {
    pending,
    startPasswordReset,
    verifyOtp,
    completePasswordReset,
    setLoginSuccessMessage,
  } = useAuth()

  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [otpError, setOtpError] = useState<string | null>(null)

  const loginPath = variant === "family" ? "/login" : "/vendor/login"

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    const phoneErr = isValidPakistanPhone(phone)
      ? null
      : "Enter a valid 10-digit mobile number starting with 3"
    setErrors({ phone: phoneErr })
    if (phoneErr) return

    setLoading(true)
    await mockAuthDelay()
    startPasswordReset(phone, variant)
    setStep("otp")
    setLoading(false)
  }

  async function handleVerifyOtp(code: string) {
    setOtpError(null)
    if (!verifyOtp(code)) {
      setOtpError("Please enter a valid 6-digit code")
      return
    }
    setLoading(true)
    await mockAuthDelay(400)
    setStep("new-password")
    setLoading(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    const passErr = validatePassword(password)
    const matchErr = validatePasswordMatch(password, confirmPassword)
    setErrors({ password: passErr, confirm: matchErr })
    if (passErr || matchErr) return

    setLoading(true)
    await mockAuthDelay()
    completePasswordReset(password)
    setLoginSuccessMessage("Password updated — please log in")
    router.push(loginPath)
  }

  const inputClass =
    "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

  return (
    <AuthCard
      variant={variant}
      badge={variant === "vendor" ? "Vendor portal" : undefined}
      title={
        step === "phone"
          ? "Reset your password"
          : step === "otp"
            ? "Verify your number"
            : "Set new password"
      }
      subtitle={
        step === "phone"
          ? "We'll send a reset code to your phone."
          : undefined
      }
      footer={
        <p className="text-center text-sm text-maroon/60">
          Remember your password?{" "}
          <Link href={loginPath} className="font-semibold text-maroon hover:text-gold-dark">
            Log in
          </Link>
        </p>
      }
    >
      {step === "phone" && (
        <form onSubmit={handleSendCode} className="space-y-5">
          <PhoneInput id="reset-phone" value={phone} onChange={setPhone} error={errors.phone} />
          <AuthSubmitButton loading={loading}>Send Reset Code</AuthSubmitButton>
        </form>
      )}

      {step === "otp" && (
        <OtpVerification
          phone={pending?.phone ?? phone}
          onVerify={handleVerifyOtp}
          loading={loading}
          error={otpError}
          submitLabel="Continue"
        />
      )}

      {step === "new-password" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-maroon/70">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "new-password-error" : undefined}
            />
            {errors.password && (
              <p id="new-password-error" className="mt-1 text-xs text-rose-600" role="alert">
                {errors.password}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-maroon/70">
              Confirm password
            </label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? "confirm-new-error" : undefined}
            />
            {errors.confirm && (
              <p id="confirm-new-error" className="mt-1 text-xs text-rose-600" role="alert">
                {errors.confirm}
              </p>
            )}
          </div>
          <AuthSubmitButton loading={loading}>Update password</AuthSubmitButton>
        </form>
      )}
    </AuthCard>
  )
}

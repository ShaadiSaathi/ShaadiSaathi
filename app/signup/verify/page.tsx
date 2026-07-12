"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import OtpVerification from "@/components/shaadi-saathi/auth/OtpVerification"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { mockAuthDelay } from "@/components/shaadi-saathi/auth/authValidation"
import { isFirebaseConfigured } from "@/lib/firebase/config"

export default function FamilySignupVerifyPage() {
  const router = useRouter()
  const { pending, verifyOtp, sendOtp, confirmOtp, isFirebaseMode } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpReady, setOtpReady] = useState(!isFirebaseConfigured())

  useEffect(() => {
    if (!pending || pending.flow !== "family-signup") {
      router.replace("/signup")
    }
  }, [pending, router])

  useEffect(() => {
    if (!isFirebaseMode || !pending) return
    let cancelled = false
    ;(async () => {
      try {
        await sendOtp()
        if (!cancelled) setOtpReady(true)
      } catch {
        if (!cancelled) setError("Could not send verification code. Please try again.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isFirebaseMode, pending, sendOtp])

  if (!pending || pending.flow !== "family-signup") {
    return null
  }

  async function handleVerify(code: string) {
    setError(null)
    if (!verifyOtp(code)) {
      setError("Please enter a valid 6-digit code")
      return
    }
    setLoading(true)
    try {
      if (isFirebaseMode) {
        await confirmOtp(code)
      } else {
        await mockAuthDelay(500)
      }
      router.push("/signup/onboarding")
    } catch {
      setError("Invalid or expired code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!isFirebaseMode) return
    setError(null)
    try {
      await sendOtp()
    } catch {
      setError("Could not resend code.")
    }
  }

  return (
    <AuthCard
      title="Verify your number"
      subtitle="We sent a 6-digit code to your phone."
      footer={
        <p className="text-center text-sm text-maroon/60">
          Wrong number?{" "}
          <Link href="/signup" className="font-semibold text-maroon hover:text-gold-dark">
            Go back
          </Link>
        </p>
      }
    >
      <div id="recaptcha-container" className="sr-only" aria-hidden="true" />
      {!otpReady && isFirebaseMode ? (
        <p className="text-center text-sm text-maroon/60">Sending code…</p>
      ) : (
        <OtpVerification
          phone={pending.phone}
          onVerify={handleVerify}
          onResend={isFirebaseMode ? handleResend : undefined}
          loading={loading}
          error={error}
        />
      )}
    </AuthCard>
  )
}

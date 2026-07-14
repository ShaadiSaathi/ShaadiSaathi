"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import OtpVerification from "@/components/shaadi-saathi/auth/OtpVerification"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { mockAuthDelay } from "@/components/shaadi-saathi/auth/authValidation"

export default function FamilyLoginVerifyPage() {
  const router = useRouter()
  const { pending, verifyOtp, sendOtp, confirmOtp, isFirebaseMode } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpReady, setOtpReady] = useState(!isFirebaseMode)

  useEffect(() => {
    if (!pending || pending.flow !== "family-login") {
      router.replace("/login")
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
        if (!cancelled) setError("Could not send verification code.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isFirebaseMode, pending, sendOtp])

  if (!pending || pending.flow !== "family-login") return null

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
      router.push("/dashboard")
    } catch {
      setError("Invalid or expired code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Verify your number" subtitle="Enter the code we sent to your phone.">
      {isFirebaseMode && (
        <div className="mb-6">
          <p className="mb-3 text-center text-sm text-maroon/70">
            {otpReady
              ? "Verified. Enter the code we texted you."
              : "Confirm you're not a robot, then we'll text your code."}
          </p>
          <div className="flex min-h-[78px] justify-center">
            <div id="recaptcha-container" className="[&_iframe]:rounded-lg" />
          </div>
        </div>
      )}
      {!otpReady && isFirebaseMode ? (
        <p className="text-center text-sm text-maroon/60">Waiting for verification…</p>
      ) : (
        <OtpVerification phone={pending.phone} onVerify={handleVerify} loading={loading} error={error} />
      )}
      <p className="mt-4 text-center text-sm text-maroon/60">
        <Link href="/login" className="font-semibold text-maroon hover:text-gold-dark">
          Back to login
        </Link>
      </p>
    </AuthCard>
  )
}

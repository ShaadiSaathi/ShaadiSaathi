"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import FirebaseOtpGate from "@/components/shaadi-saathi/auth/FirebaseOtpGate"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { mockAuthDelay } from "@/components/shaadi-saathi/auth/authValidation"

export default function FamilySignupVerifyPage() {
  const router = useRouter()
  const { pending, verifyOtp, confirmOtp, isFirebaseMode } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pending || pending.flow !== "family-signup") {
      router.replace("/signup")
    }
  }, [pending, router])

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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That code isn't correct. Please try again."
      )
    } finally {
      setLoading(false)
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
      <FirebaseOtpGate
        phone={pending.phone}
        onVerify={handleVerify}
        verifyLoading={loading}
        verifyError={error}
      />
    </AuthCard>
  )
}

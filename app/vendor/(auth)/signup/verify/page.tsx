"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import FirebaseOtpGate from "@/components/shaadi-saathi/auth/FirebaseOtpGate"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"

export default function VendorSignupVerifyPage() {
  const router = useRouter()
  const { pending, verifyOtp, confirmOtp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pending || pending.flow !== "vendor-signup") {
      router.replace("/vendor/signup")
    }
  }, [pending, router])

  if (!pending || pending.flow !== "vendor-signup") {
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
      // Always confirm against Firebase — a wrong code throws and is shown as
      // an error; we only proceed to onboarding after a genuine success.
      await confirmOtp(code)
      router.push("/vendor/signup/onboarding")
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
      variant="vendor"
      badge="Vendor portal"
      title="Verify your number"
      subtitle="Enter the code we sent to your business phone."
      footer={
        <p className="text-center text-sm text-maroon/60">
          Wrong number?{" "}
          <Link href="/vendor/signup" className="font-semibold text-maroon hover:text-gold-dark">
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

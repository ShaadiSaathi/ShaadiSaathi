"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import OtpVerification from "@/components/shaadi-saathi/auth/OtpVerification"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { mockAuthDelay } from "@/components/shaadi-saathi/auth/authValidation"

export default function VendorSignupVerifyPage() {
  const router = useRouter()
  const { pending, verifyOtp } = useAuth()
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
    await mockAuthDelay(500)
    router.push("/vendor/signup/onboarding")
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
      <OtpVerification
        phone={pending.phone}
        onVerify={handleVerify}
        loading={loading}
        error={error}
      />
    </AuthCard>
  )
}

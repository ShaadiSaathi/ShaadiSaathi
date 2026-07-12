"use client"

import { useRouter } from "next/navigation"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import VendorOnboardingStep from "@/components/shaadi-saathi/auth/VendorOnboardingStep"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"

export default function VendorSignupOnboardingPage() {
  const router = useRouter()
  const { completeVendorOnboarding } = useAuth()

  return (
    <AuthCard
      variant="vendor"
      badge="Vendor portal"
      title="Complete your profile"
      subtitle="Help families discover your business."
    >
      <VendorOnboardingStep
        onComplete={(bio, cover) => {
          completeVendorOnboarding(bio, cover)
          router.push("/vendor/dashboard")
        }}
      />
    </AuthCard>
  )
}

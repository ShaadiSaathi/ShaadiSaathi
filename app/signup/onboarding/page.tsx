"use client"

import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import FamilyOnboardingStep from "@/components/shaadi-saathi/auth/FamilyOnboardingStep"

export default function FamilySignupOnboardingPage() {
  return (
    <AuthCard
      title="Set up your wedding"
      subtitle="Just one quick step before your dashboard."
    >
      <FamilyOnboardingStep />
    </AuthCard>
  )
}

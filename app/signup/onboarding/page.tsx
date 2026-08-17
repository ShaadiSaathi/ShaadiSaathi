"use client"

import { useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import FamilyOnboardingStep from "@/components/shaadi-saathi/auth/FamilyOnboardingStep"

export default function FamilySignupOnboardingPage() {
  const [phase, setPhase] = useState<"wedding" | "preferences">("wedding")

  const isPreferences = phase === "preferences"

  return (
    <AuthCard
      premium
      progress={{ step: isPreferences ? 4 : 3, total: 4 }}
      title={isPreferences ? "Tell us about your wedding" : "Set up your wedding"}
      subtitle={
        isPreferences
          ? "Optional — helps Wedding AI tailor answers from your first question. Change anytime in Settings."
          : "Just one quick step before your dashboard."
      }
    >
      <FamilyOnboardingStep onPhaseChange={setPhase} />
    </AuthCard>
  )
}

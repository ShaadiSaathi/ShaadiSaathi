"use client"

import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import CollaboratorJoinStep from "@/components/shaadi-saathi/family/CollaboratorJoinStep"

export default function SignupJoinPage() {
  return (
    <AuthCard
      premium
      progress={{ step: 3, total: 4 }}
      title="Join a wedding"
      subtitle="Someone invited you to help plan — accept to get started."
    >
      <CollaboratorJoinStep fallbackHref="/signup/onboarding" successHref="/dashboard" />
    </AuthCard>
  )
}

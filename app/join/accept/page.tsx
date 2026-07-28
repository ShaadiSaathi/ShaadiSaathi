"use client"

import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import CollaboratorJoinStep from "@/components/shaadi-saathi/family/CollaboratorJoinStep"

export default function JoinAcceptPage() {
  return (
    <AuthCard
      title="Join a wedding"
      subtitle="Accept your invite to open the shared planning dashboard."
    >
      <CollaboratorJoinStep fallbackHref="/dashboard" successHref="/dashboard" />
    </AuthCard>
  )
}

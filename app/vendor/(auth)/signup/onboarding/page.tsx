"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import VendorOnboardingWizard, {
  EMPTY_ONBOARDING_FORM,
  type VendorOnboardingFormState,
} from "@/components/shaadi-saathi/auth/VendorOnboardingWizard"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"

export default function VendorSignupOnboardingPage() {
  const router = useRouter()
  const {
    pending,
    isVendorLoggedIn,
    vendorId,
    firebaseUser,
    ensureVendorOnboardingDraft,
    completeVendorOnboardingSubmit,
  } = useAuth()
  const completingRef = useRef(false)
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(vendorId)

  useEffect(() => {
    if (vendorId) setResolvedVendorId(vendorId)
  }, [vendorId])

  useEffect(() => {
    if (completingRef.current || isVendorLoggedIn) return
    if (!pending || pending.flow !== "vendor-signup") {
      router.replace("/vendor/signup")
    }
  }, [pending, isVendorLoggedIn, router])

  const initial = useMemo((): VendorOnboardingFormState => {
    const seed = pending?.vendor
    return {
      ...EMPTY_ONBOARDING_FORM,
      businessName: seed?.businessName ?? "",
      categoryId: seed?.categoryId ?? "catering",
      city: seed?.city ?? "Lahore",
      phone: seed?.phone ?? "",
    }
  }, [pending?.vendor])

  if (
    !completingRef.current &&
    !isVendorLoggedIn &&
    (!pending || pending.flow !== "vendor-signup")
  ) {
    return null
  }

  return (
    <AuthCard
      variant="vendor"
      badge="Vendor portal"
      title="Set up your listing"
      subtitle="A short guided setup — then we review before families can book you."
    >
      <VendorOnboardingWizard
        initial={initial}
        vendorId={resolvedVendorId}
        uid={firebaseUser?.uid ?? null}
        onSaveDraft={async (data, step) => {
          const id = await ensureVendorOnboardingDraft(data, step)
          setResolvedVendorId(id)
          return id
        }}
        onSubmit={async (data) => {
          completingRef.current = true
          try {
            await completeVendorOnboardingSubmit(data)
            router.push("/vendor/dashboard")
          } catch (err) {
            completingRef.current = false
            throw err
          }
        }}
      />
    </AuthCard>
  )
}

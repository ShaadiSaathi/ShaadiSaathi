"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import VendorOnboardingWizard, {
  EMPTY_ONBOARDING_FORM,
  type VendorOnboardingFormState,
} from "@/components/shaadi-saathi/auth/VendorOnboardingWizard"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { getVendorKyc } from "@/lib/firebase/vendor-kyc"
import {
  getVendor,
  submitVendorOnboarding,
  updateVendorOnboardingDraft,
} from "@/lib/firebase/vendors"
import type { VendorCategoryId } from "@/lib/mockVendors"
import type { EventId } from "@/lib/mockData"
import {
  normalizeVendorOnboardingStatus,
} from "@/lib/firebase/vendor-onboarding"

/** Continue / edit guided onboarding while draft or pending review. */
export default function VendorOnboardingEditPage() {
  const router = useRouter()
  const { vendorId, firebaseUser, isFirebaseMode } = useAuth()
  const { refreshBusiness } = useVendorPortal()
  const [initial, setInitial] = useState<VendorOnboardingFormState | null>(null)
  const [initialStep, setInitialStep] = useState(1)
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isFirebaseMode || !vendorId) {
      setLoading(false)
      setInitial({ ...EMPTY_ONBOARDING_FORM })
      return
    }
    setLoading(true)
    setError(null)
    try {
      const vendor = await getVendor(vendorId)
      if (!vendor) throw new Error("Vendor profile not found")
      const status = normalizeVendorOnboardingStatus(
        vendor.onboardingStatus,
        vendor.verificationStatus
      )
      if (status === "active") {
        router.replace("/vendor/profile")
        return
      }
      const kyc = await getVendorKyc(vendorId)
      setEditMode(status === "pending_review" || status === "rejected")
      setInitialStep(
        status === "draft"
          ? Math.min(4, Math.max(1, vendor.onboardingStep ?? 1))
          : 1
      )
      setInitial({
        businessName: vendor.businessName,
        categoryId: vendor.categoryId as VendorCategoryId,
        city: vendor.city,
        phone: vendor.phone,
        email: vendor.email ?? "",
        photoUrls: vendor.photoUrls ?? [],
        coverPhotoUrl: vendor.coverPhotoUrl ?? vendor.photoUrls?.[0] ?? "",
        bio: vendor.bio ?? "",
        startingPrice:
          typeof vendor.startingPrice === "number"
            ? String(vendor.startingPrice)
            : "",
        pricingNotes: vendor.pricingNotes ?? "",
        availableFor: (vendor.availableFor ?? [
          "mehndi",
          "baraat",
          "walima",
        ]) as EventId[],
        cnic: kyc?.verificationCnic ?? "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load onboarding")
    } finally {
      setLoading(false)
    }
  }, [isFirebaseMode, vendorId, router])

  useEffect(() => {
    void load()
  }, [load])

  const title = useMemo(() => {
    if (editMode) return "Edit your submission"
    return "Finish setting up"
  }, [editMode])

  if (loading || !initial) {
    return (
      <PageTransition>
        <p className="text-sm text-maroon/60">Loading onboarding…</p>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-maroon/60">
          {editMode
            ? "Changes stay under review until an admin approves your listing."
            : "Complete all steps, then submit for review."}
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mx-auto max-w-lg rounded-2xl border border-gold/25 bg-white p-5 sm:p-6">
        <VendorOnboardingWizard
          initial={initial}
          initialStep={initialStep}
          editMode={editMode}
          vendorId={vendorId}
          uid={firebaseUser?.uid ?? null}
          onSaveDraft={async (data, step) => {
            if (!isFirebaseMode || !vendorId || !firebaseUser) return
            await updateVendorOnboardingDraft(vendorId, firebaseUser.uid, {
              businessName: data.businessName,
              categoryId: data.categoryId,
              city: data.city,
              phone: data.phone,
              email: data.email.trim() || null,
              bio: data.bio,
              startingPrice: data.startingPrice
                ? Number(data.startingPrice)
                : undefined,
              pricingNotes: data.pricingNotes.trim() || null,
              availableFor: data.availableFor,
              photoUrls: data.photoUrls,
              coverPhotoUrl: data.coverPhotoUrl || null,
              onboardingStep: step,
            })
          }}
          onSubmit={async (data) => {
            if (!isFirebaseMode || !vendorId || !firebaseUser) {
              router.push("/vendor/dashboard")
              return
            }
            await submitVendorOnboarding(vendorId, firebaseUser.uid, {
              cnic: data.cnic,
              businessName: data.businessName,
              city: data.city,
              categoryId: data.categoryId,
              phone: data.phone,
              email: data.email.trim() || undefined,
              bio: data.bio,
              startingPrice: Number(data.startingPrice),
              pricingNotes: data.pricingNotes.trim() || undefined,
              availableFor: data.availableFor,
              photoUrls: data.photoUrls,
              coverPhotoUrl: data.coverPhotoUrl || undefined,
            })
            await refreshBusiness()
            router.push("/vendor/dashboard")
          }}
        />
      </div>
    </PageTransition>
  )
}

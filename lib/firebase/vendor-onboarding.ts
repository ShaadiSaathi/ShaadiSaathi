/**
 * Guided vendor onboarding — draft → pending_review → active | rejected.
 * Kept in sync with verificationStatus for the existing admin review gate.
 */

export const VENDOR_ONBOARDING_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "rejected",
] as const

export type VendorOnboardingStatus = (typeof VENDOR_ONBOARDING_STATUSES)[number]

export const VENDOR_ONBOARDING_STEPS = [1, 2, 3, 4] as const
export type VendorOnboardingStep = (typeof VENDOR_ONBOARDING_STEPS)[number]

export function isVendorOnboardingStatus(
  value: unknown
): value is VendorOnboardingStatus {
  return (
    typeof value === "string" &&
    (VENDOR_ONBOARDING_STATUSES as readonly string[]).includes(value)
  )
}

/**
 * Normalize for display. Legacy docs without onboardingStatus map from
 * verificationStatus; unverified-without-field stays "active" for portal access
 * so pre-guided vendors are not forced back into the wizard.
 */
export function normalizeVendorOnboardingStatus(
  value: unknown,
  verificationStatus?: unknown
): VendorOnboardingStatus {
  if (isVendorOnboardingStatus(value)) return value
  if (verificationStatus === "verified") return "active"
  if (verificationStatus === "pending") return "pending_review"
  if (verificationStatus === "rejected") return "rejected"
  return "active"
}

/** Only vendors explicitly in draft (new guided signup) must finish the wizard. */
export function vendorNeedsOnboarding(onboardingStatus: unknown): boolean {
  return onboardingStatus === "draft"
}

export function vendorOnboardingIsPending(
  onboardingStatus: unknown,
  verificationStatus?: unknown
): boolean {
  if (onboardingStatus === "pending_review") return true
  return verificationStatus === "pending"
}

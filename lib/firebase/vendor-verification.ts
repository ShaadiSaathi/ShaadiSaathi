/**
 * Lightweight vendor identity verification (manual admin review).
 * Not a full KYC/compliance stack — gates real money movement only.
 */

export const VENDOR_VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const

export type VendorVerificationStatus = (typeof VENDOR_VERIFICATION_STATUSES)[number]

export const VENDOR_UNVERIFIED_PAYMENT_MESSAGE =
  "This vendor is not verified yet. Deposits and payouts can only be released to verified vendors. Ask them to complete verification in their vendor profile."

export function isVendorVerificationStatus(
  value: unknown
): value is VendorVerificationStatus {
  return (
    typeof value === "string" &&
    (VENDOR_VERIFICATION_STATUSES as readonly string[]).includes(value)
  )
}

/** Missing field (legacy docs) counts as unverified — never assume verified. */
export function normalizeVendorVerificationStatus(
  value: unknown
): VendorVerificationStatus {
  return isVendorVerificationStatus(value) ? value : "unverified"
}

export function vendorCanReceivePayments(status: unknown): boolean {
  return normalizeVendorVerificationStatus(status) === "verified"
}

export function sanitizeCnic(raw: string): string {
  return raw.trim().replace(/\s+/g, "")
}

export function isValidCnicInput(raw: string): boolean {
  const cleaned = sanitizeCnic(raw)
  // Pakistan CNIC is typically 13 digits; allow 5–20 alphanumeric for flexibility.
  return cleaned.length >= 5 && cleaned.length <= 20 && /^[A-Za-z0-9-]+$/.test(cleaned)
}

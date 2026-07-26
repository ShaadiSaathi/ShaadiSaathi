/**
 * Persist the in-progress auth phone-verify session across soft navigations
 * and accidental remounts. Never stores passwords.
 */

import type { VendorCategoryId } from "@/lib/mockVendors"

const STORAGE_KEY = "ss_auth_pending_v1"

export type PersistedPendingFlow =
  | "family-signup"
  | "vendor-signup"
  | "family-reset"
  | "vendor-reset"
  | "family-login"
  | "vendor-login"

export interface PersistedPending {
  flow: PersistedPendingFlow
  phone: string
  familyName?: string
  vendor?: {
    businessName: string
    categoryId: VendorCategoryId
    city: string
    phone: string
  }
}

export function writePersistedPending(pending: PersistedPending | null): void {
  if (typeof window === "undefined") return
  try {
    if (!pending) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
  } catch {
    // ignore quota / private mode
  }
}

export function readPersistedPending(): PersistedPending | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedPending
    if (!parsed?.flow || !parsed?.phone) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPersistedPending(): void {
  writePersistedPending(null)
}

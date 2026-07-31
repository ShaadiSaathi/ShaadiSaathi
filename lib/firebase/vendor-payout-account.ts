/**
 * Vendor payout destination (Safepay Raastwire requires a Pakistani IBAN).
 * Stored in a separate collection — never on the public `vendors` listing doc.
 */

import { doc, getDoc, setDoc } from "firebase/firestore"
import { getFirestoreDb, isFirebaseConfigured } from "./config"

export type VendorPayoutAccount = {
  vendorId: string
  ownerUid: string
  /** Pakistani IBAN — required by Safepay creditor_iban */
  iban: string
  accountHolderName: string
  bankName: string
  /** Optional free-text account number for admin review (IBAN is authoritative) */
  accountNumber?: string
  updatedAt: number
  createdAt: number
}

const IBAN_PK_PATTERN = /^PK\d{2}[A-Z0-9]{20}$/i

export function normalizePakistaniIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase()
}

export function isValidPakistaniIban(raw: string): boolean {
  return IBAN_PK_PATTERN.test(normalizePakistaniIban(raw))
}

export async function getVendorPayoutAccount(
  vendorId: string
): Promise<VendorPayoutAccount | null> {
  if (!isFirebaseConfigured()) return null
  const snap = await getDoc(doc(getFirestoreDb(), "vendor_payout_accounts", vendorId))
  if (!snap.exists()) return null
  return { vendorId: snap.id, ...snap.data() } as VendorPayoutAccount
}

export type SaveVendorPayoutAccountInput = {
  iban: string
  accountHolderName: string
  bankName: string
  accountNumber?: string
}

export async function saveVendorPayoutAccount(
  vendorId: string,
  ownerUid: string,
  input: SaveVendorPayoutAccountInput
): Promise<VendorPayoutAccount> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }

  const iban = normalizePakistaniIban(input.iban)
  const accountHolderName = input.accountHolderName.trim()
  const bankName = input.bankName.trim()
  const accountNumber = input.accountNumber?.trim() || undefined

  if (!isValidPakistaniIban(iban)) {
    throw new Error(
      "Enter a valid Pakistani IBAN (24 characters, starts with PK — e.g. PK25ALFH0216001008658216)"
    )
  }
  if (accountHolderName.length < 2) {
    throw new Error("Account holder name is required")
  }
  if (bankName.length < 2) {
    throw new Error("Bank name is required")
  }

  const existing = await getVendorPayoutAccount(vendorId)
  if (existing && existing.ownerUid !== ownerUid) {
    throw new Error("Not authorized to update this payout account")
  }

  const now = Date.now()
  const record: VendorPayoutAccount = {
    vendorId,
    ownerUid,
    iban,
    accountHolderName,
    bankName,
    ...(accountNumber ? { accountNumber } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  await setDoc(doc(getFirestoreDb(), "vendor_payout_accounts", vendorId), record, {
    merge: true,
  })

  return record
}

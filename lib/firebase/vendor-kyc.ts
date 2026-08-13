import { doc, getDoc, setDoc } from "firebase/firestore"
import { getFirestoreDb } from "./config"

export type VendorKycRecord = {
  vendorId: string
  ownerUid: string
  verificationCnic: string
  verificationBusinessName: string
  verificationCity: string
  submittedAt: number
  updatedAt: number
}

export async function getVendorKyc(vendorId: string): Promise<VendorKycRecord | null> {
  const snap = await getDoc(doc(getFirestoreDb(), "vendor_kyc", vendorId))
  if (!snap.exists()) return null
  return snap.data() as VendorKycRecord
}

export async function upsertVendorKyc(record: VendorKycRecord): Promise<void> {
  await setDoc(doc(getFirestoreDb(), "vendor_kyc", record.vendorId), record)
}

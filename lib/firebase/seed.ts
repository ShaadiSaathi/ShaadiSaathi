import { getFirestoreDb, isFirebaseConfigured } from "./config"
import { getUserProfile } from "./users"
import { createWedding, getWedding, newWeddingId } from "./weddings"
import { createUserProfile } from "./users"
import { WEDDING } from "@/lib/mockData"
import type { FirestoreWedding } from "./types"

/**
 * Retained ONLY as the weddingId used in local/mock mode (Firebase not
 * configured). It is never used to scope a real signed-in user's data.
 */
export const DEMO_WEDDING_ID = WEDDING.id
export const DEMO_VENDOR_ID = "vendor-1"

function makeShareCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `SS-${code}`
}

/**
 * Look up the wedding for a returning family user WITHOUT creating or seeding
 * anything. Returns null when the user has no wedding yet (→ empty states).
 */
export async function getWeddingForUser(uid: string): Promise<string | null> {
  if (!isFirebaseConfigured()) return DEMO_WEDDING_ID

  const profile = await getUserProfile(getFirestoreDb(), uid)
  if (!profile?.weddingId) return null
  const wedding = await getWedding(profile.weddingId)
  return wedding ? profile.weddingId : null
}

/**
 * Create a brand-new, uniquely-scoped wedding for a family user during signup
 * onboarding — or return their existing wedding if one already exists.
 *
 * Guarantees a genuinely fresh start:
 *  - a fresh auto-generated document ID (never reused / never shared)
 *  - ownerId + memberUids set to the new user's Firebase Auth UID
 *  - ONLY the fields the user just entered (name, first event date)
 *  - NO seeded guests, bookings, or tasks of any kind
 */
export async function createWeddingForUser(
  uid: string,
  organiserName: string,
  organiserPhone: string,
  weddingName: string,
  firstEventDate: string
): Promise<string> {
  if (!isFirebaseConfigured()) return DEMO_WEDDING_ID

  const existing = await getUserProfile(getFirestoreDb(), uid)
  if (existing?.weddingId) {
    const wedding = await getWedding(existing.weddingId)
    if (wedding) return existing.weddingId
  }

  const weddingId = newWeddingId()
  const trimmedName = weddingName.trim()

  const wedding: Omit<FirestoreWedding, "createdAt"> = {
    id: weddingId,
    name: trimmedName,
    couple: trimmedName,
    shareCode: makeShareCode(),
    isPremium: false,
    inviteTheme: "classic",
    ownerId: uid,
    memberUids: [uid],
    organiserName,
    organiserPhone,
    firstEventDate,
  }
  await createWedding(wedding)

  await createUserProfile(getFirestoreDb(), {
    uid,
    role: "family",
    phone: organiserPhone,
    name: organiserName,
    weddingId,
  })

  return weddingId
}

export async function ensureDemoVendorSeeded(
  uid: string,
  vendorInput: {
    businessName: string
    categoryId: import("@/lib/mockVendors").VendorCategoryId
    city: string
    phone: string
    bio: string
  }
): Promise<string> {
  if (!isFirebaseConfigured()) return DEMO_VENDOR_ID

  const existing = await getUserProfile(getFirestoreDb(), uid)
  if (existing?.vendorId) return existing.vendorId

  const vendorId = DEMO_VENDOR_ID
  const { setDoc, doc, getDoc } = await import("firebase/firestore")
  const db = getFirestoreDb()

  const vendorSnap = await getDoc(doc(db, "vendors", vendorId))
  if (!vendorSnap.exists()) {
    await setDoc(doc(db, "vendors", vendorId), {
      id: vendorId,
      businessName: vendorInput.businessName,
      categoryId: vendorInput.categoryId,
      city: vendorInput.city,
      phone: vendorInput.phone,
      bio: vendorInput.bio,
      ownerUid: uid,
      subscriptionTier: "basic",
      createdAt: Date.now(),
    })
  }

  await createUserProfile(getFirestoreDb(), {
    uid,
    role: "vendor",
    phone: vendorInput.phone,
    name: vendorInput.businessName,
    vendorId,
  })

  return vendorId
}

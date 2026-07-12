import { getFirestoreDb, isFirebaseConfigured } from "./config"
import { getUserProfile } from "./users"
import { createWedding, getWedding } from "./weddings"
import { seedGuestsBatch } from "./guests"
import { seedBookingsBatch } from "./bookings"
import { createUserProfile } from "./users"
import { GUESTS, WEDDING } from "@/lib/mockData"
import { INITIAL_BOOKINGS, VENDORS } from "@/lib/mockVendors"
import type { FirestoreWedding } from "./types"

export const DEMO_WEDDING_ID = WEDDING.id
export const DEMO_VENDOR_ID = "vendor-1"

export async function ensureDemoWeddingSeeded(
  uid: string,
  organiserName: string,
  organiserPhone: string,
  weddingName?: string
): Promise<string> {
  if (!isFirebaseConfigured()) return DEMO_WEDDING_ID

  const existing = await getUserProfile(getFirestoreDb(), uid)
  if (existing?.weddingId) {
    const wedding = await getWedding(existing.weddingId)
    if (wedding) return existing.weddingId
  }

  const weddingId = DEMO_WEDDING_ID
  const weddingDoc = await getWedding(weddingId)

  if (!weddingDoc) {
    const wedding: Omit<FirestoreWedding, "createdAt"> = {
      id: weddingId,
      name: weddingName ?? WEDDING.name,
      couple: WEDDING.couple,
      shareCode: WEDDING.shareCode,
      isPremium: false,
      inviteTheme: "classic",
      memberUids: [uid],
      organiserName,
      organiserPhone,
      firstEventDate: "2026-08-08",
    }
    await createWedding(wedding)
    await seedGuestsBatch(weddingId, GUESTS)
    await seedBookingsBatch(
      weddingId,
      INITIAL_BOOKINGS.map((b) => {
        const vendor = VENDORS.find((v) => v.id === b.vendorId)
        return {
          id: b.id,
          vendorId: b.vendorId,
          eventId: b.eventId,
          status: b.status,
          price: b.price,
          packageName: b.packageName,
          guestCount: b.guestCount,
          paymentPath: b.payment?.paymentPath ?? "online",
          familyName: organiserName,
          weddingName: weddingName ?? WEDDING.name,
          vendorName: vendor?.name ?? "Vendor",
        }
      })
    )
  } else if (!weddingDoc.memberUids.includes(uid)) {
    const { updateDoc, doc } = await import("firebase/firestore")
    await updateDoc(doc(getFirestoreDb(), "weddings", weddingId), {
      memberUids: [...weddingDoc.memberUids, uid],
    })
  }

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

import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import type { EventId } from "@/lib/mockData"
import type { Vendor, VendorCategoryId, VendorPackage } from "@/lib/mockVendors"
import { getFirestoreDb, isFirebaseConfigured } from "./config"
import { DEMO_VENDOR_ID } from "./seed"
import type { FirestoreVendor } from "./types"
import { createUserProfile, getUserProfile, upsertUserProfile, updateUserContactEmail } from "./users"
import { upsertVendorKyc } from "./vendor-kyc"
import {
  isValidCnicInput,
  normalizeVendorVerificationStatus,
  sanitizeCnic,
  type VendorVerificationStatus,
} from "./vendor-verification"

const ALL_EVENTS: EventId[] = ["mehndi", "baraat", "walima"]

const DEFAULT_COVER_GRADIENTS = [
  "from-amber-200 via-orange-100 to-rose-100",
  "from-emerald-100 via-amber-50 to-rose-50",
  "from-rose-200 via-maroon/20 to-gold/30",
  "from-sky-100 via-indigo-50 to-violet-100",
  "from-stone-200 via-amber-50 to-orange-100",
] as const

export type CreateVendorInput = {
  businessName: string
  categoryId: VendorCategoryId
  city: string
  phone: string
  bio: string
}

/** Fresh never-reused auto-ID for a new vendor document. */
export function newVendorId(): string {
  return doc(collection(getFirestoreDb(), "vendors")).id
}

function coverGradientForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % DEFAULT_COVER_GRADIENTS.length
  }
  return DEFAULT_COVER_GRADIENTS[hash] ?? DEFAULT_COVER_GRADIENTS[0]
}

function normalizeVendor(raw: FirestoreVendor): FirestoreVendor {
  return {
    ...raw,
    id: raw.id,
    availableFor: raw.availableFor?.length ? raw.availableFor : ALL_EVENTS,
    subscriptionTier: raw.subscriptionTier === "featured" ? "featured" : "basic",
    completedJobsCount: raw.completedJobsCount ?? 0,
    emergencyAvailable: raw.emergencyAvailable ?? false,
    reliabilityScore: raw.reliabilityScore ?? 90,
    noShowCount: raw.noShowCount ?? 0,
    suspended: raw.suspended ?? false,
    acceptsCardInPerson: raw.acceptsCardInPerson ?? false,
    featuredBoost:
      raw.featuredBoost ?? (raw.subscriptionTier === "featured" ? 10 : 0),
    verificationStatus: normalizeVendorVerificationStatus(raw.verificationStatus),
  }
}

/**
 * Map a Firestore vendor profile into the directory `Vendor` shape used by
 * family browse/detail cards. Missing photos/packages/price show as incomplete
 * placeholders in the UI rather than hiding the listing.
 */
export function toDirectoryVendor(raw: FirestoreVendor): Vendor {
  const v = normalizeVendor(raw)
  const cover = v.coverGradient ?? coverGradientForId(v.id)
  const gallery =
    v.galleryGradients && v.galleryGradients.length > 0
      ? v.galleryGradients
      : [cover]
  const packages: VendorPackage[] | undefined = v.packages?.map((p) => ({
    name: p.name,
    price: p.price,
    perHead: p.perHead,
    description: p.description,
  }))
  const isFeatured = v.subscriptionTier === "featured"

  return {
    id: v.id,
    name: v.businessName,
    categoryId: v.categoryId,
    city: v.city,
    rating: v.rating ?? 0,
    reviewCount: v.reviewCount ?? 0,
    startingPrice: v.startingPrice ?? 0,
    bio: v.bio || "",
    coverGradient: cover,
    galleryGradients: gallery,
    packages,
    reviews: [],
    availableFor: v.availableFor ?? ALL_EVENTS,
    featured: isFeatured,
    subscriptionTier: v.subscriptionTier,
    featuredBoost: v.featuredBoost,
    emergencyAvailable: v.emergencyAvailable,
    reliabilityScore: v.reliabilityScore,
    noShowCount: v.noShowCount,
    suspended: v.suspended,
    acceptsCardInPerson: v.acceptsCardInPerson,
    completedJobsCount: v.completedJobsCount,
    verificationStatus: v.verificationStatus,
  }
}

export async function getVendor(vendorId: string): Promise<FirestoreVendor | null> {
  if (!isFirebaseConfigured()) return null
  const snap = await getDoc(doc(getFirestoreDb(), "vendors", vendorId))
  if (!snap.exists()) return null
  return normalizeVendor({ id: snap.id, ...snap.data() } as FirestoreVendor)
}

export async function getVendorForUser(uid: string): Promise<FirestoreVendor | null> {
  if (!isFirebaseConfigured()) return null
  const profile = await getUserProfile(getFirestoreDb(), uid)
  if (!profile?.vendorId) return null
  return getVendor(profile.vendorId)
}

export async function listVendors(): Promise<FirestoreVendor[]> {
  if (!isFirebaseConfigured()) return []
  const snap = await getDocs(collection(getFirestoreDb(), "vendors"))
  return snap.docs
    .map((d) => normalizeVendor({ id: d.id, ...d.data() } as FirestoreVendor))
    .filter((v) => !v.suspended)
}

export function subscribeVendors(
  onData: (vendors: FirestoreVendor[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreDb(), "vendors"),
    (snap) => {
      const list = snap.docs
        .map((d) => normalizeVendor({ id: d.id, ...d.data() } as FirestoreVendor))
        .filter((v) => !v.suspended)
      onData(list)
    },
    (err) => onError?.(err)
  )
}

/**
 * Create a brand-new vendor profile for a signed-up vendor, or return their
 * existing vendorId if one is already linked. Never reuses a shared demo id.
 */
export async function createVendorForUser(
  uid: string,
  input: CreateVendorInput
): Promise<string> {
  if (!isFirebaseConfigured()) return DEMO_VENDOR_ID

  const db = getFirestoreDb()
  const existing = await getUserProfile(db, uid)
  if (existing?.vendorId) {
    const vendor = await getVendor(existing.vendorId)
    if (vendor) return existing.vendorId
  }

  const vendorId = newVendorId()
  const businessName = input.businessName.trim()
  const vendor: FirestoreVendor = {
    id: vendorId,
    businessName,
    categoryId: input.categoryId,
    city: input.city.trim(),
    phone: input.phone.trim(),
    bio: input.bio.trim(),
    ownerUid: uid,
    subscriptionTier: "basic",
    availableFor: ALL_EVENTS,
    completedJobsCount: 0,
    emergencyAvailable: false,
    reliabilityScore: 90,
    noShowCount: 0,
    suspended: false,
    acceptsCardInPerson: false,
    featuredBoost: 0,
    coverGradient: coverGradientForId(vendorId),
    verificationStatus: "unverified",
    createdAt: Date.now(),
  }

  await setDoc(doc(db, "vendors", vendorId), vendor)

  if (existing) {
    await upsertUserProfile(db, {
      uid,
      role: "vendor",
      phone: input.phone.trim(),
      name: businessName,
      vendorId,
      createdAt: existing.createdAt,
    })
  } else {
    await createUserProfile(db, {
      uid,
      role: "vendor",
      phone: input.phone.trim(),
      name: businessName,
      vendorId,
    })
  }

  return vendorId
}

export type SubmitVendorVerificationInput = {
  cnic: string
  businessName: string
  city: string
}

/**
 * Vendor submits / resubmits identity details for manual admin review.
 * Sets status to pending; cannot self-approve.
 */
export async function submitVendorVerification(
  vendorId: string,
  ownerUid: string,
  input: SubmitVendorVerificationInput
): Promise<VendorVerificationStatus> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }

  const cnic = sanitizeCnic(input.cnic)
  const businessName = input.businessName.trim()
  const city = input.city.trim()

  if (!isValidCnicInput(cnic)) {
    throw new Error("Enter a valid CNIC / ID number (5–20 characters)")
  }
  if (businessName.length < 2) {
    throw new Error("Business name is required")
  }
  if (city.length < 2) {
    throw new Error("City is required")
  }

  const vendor = await getVendor(vendorId)
  if (!vendor) {
    throw new Error("Vendor profile not found")
  }
  if (vendor.ownerUid !== ownerUid) {
    throw new Error("Not authorized to update this vendor")
  }
  if (vendor.verificationStatus === "verified") {
    throw new Error("This vendor is already verified")
  }
  if (vendor.verificationStatus === "pending") {
    throw new Error("Verification is already under review")
  }

  const now = Date.now()
  await upsertVendorKyc({
    vendorId,
    ownerUid,
    verificationCnic: cnic,
    verificationBusinessName: businessName,
    verificationCity: city,
    submittedAt: now,
    updatedAt: now,
  })
  await updateDoc(doc(getFirestoreDb(), "vendors", vendorId), {
    verificationStatus: "pending",
    verificationCnic: deleteField(),
    verificationBusinessName: businessName,
    verificationCity: city,
    verificationSubmittedAt: now,
    verificationRejectionReason: deleteField(),
  })

  return "pending"
}

/** Optional contact email on vendor listing + owner user profile. */
export async function updateVendorContactEmail(
  vendorId: string,
  ownerUid: string,
  email: string | null
): Promise<void> {
  if (!isFirebaseConfigured()) return
  const db = getFirestoreDb()
  const vendor = await getVendor(vendorId)
  if (!vendor || vendor.ownerUid !== ownerUid) {
    throw new Error("Not authorized to update this vendor")
  }
  await updateDoc(doc(db, "vendors", vendorId), {
    email: email ? email : deleteField(),
  })
  await updateUserContactEmail(db, ownerUid, email)
}

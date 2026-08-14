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
  normalizeVendorOnboardingStatus,
  type VendorOnboardingStatus,
} from "./vendor-onboarding"
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
  bio?: string
  email?: string
  startingPrice?: number
  pricingNotes?: string
  availableFor?: EventId[]
  photoUrls?: string[]
  coverPhotoUrl?: string
  onboardingStatus?: VendorOnboardingStatus
  onboardingStep?: number
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
  const verificationStatus = normalizeVendorVerificationStatus(raw.verificationStatus)
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
    verificationStatus,
    onboardingStatus: normalizeVendorOnboardingStatus(
      raw.onboardingStatus,
      verificationStatus
    ),
    photoUrls: Array.isArray(raw.photoUrls)
      ? raw.photoUrls.filter((u): u is string => typeof u === "string" && u.length > 0)
      : [],
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
    bio: (input.bio ?? "").trim(),
    ownerUid: uid,
    subscriptionTier: "basic",
    availableFor: input.availableFor?.length ? input.availableFor : ALL_EVENTS,
    completedJobsCount: 0,
    emergencyAvailable: false,
    reliabilityScore: 90,
    noShowCount: 0,
    suspended: false,
    acceptsCardInPerson: false,
    featuredBoost: 0,
    coverGradient: coverGradientForId(vendorId),
    verificationStatus: "unverified",
    onboardingStatus: input.onboardingStatus ?? "draft",
    onboardingStep: input.onboardingStep ?? 1,
    createdAt: Date.now(),
  }
  if (input.email?.trim()) vendor.email = input.email.trim()
  if (typeof input.startingPrice === "number" && Number.isFinite(input.startingPrice)) {
    vendor.startingPrice = Math.max(0, Math.round(input.startingPrice))
  }
  if (input.pricingNotes?.trim()) vendor.pricingNotes = input.pricingNotes.trim()
  if (input.photoUrls?.length) vendor.photoUrls = input.photoUrls
  if (input.coverPhotoUrl?.trim()) vendor.coverPhotoUrl = input.coverPhotoUrl.trim()

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

export type VendorOnboardingDraftInput = {
  businessName?: string
  categoryId?: VendorCategoryId
  city?: string
  phone?: string
  email?: string | null
  bio?: string
  startingPrice?: number
  pricingNotes?: string | null
  availableFor?: EventId[]
  photoUrls?: string[]
  coverPhotoUrl?: string | null
  onboardingStep?: number
}

/**
 * Save guided-onboarding fields while draft or pending review.
 * Does not change verificationStatus / onboarding submit state.
 */
export async function updateVendorOnboardingDraft(
  vendorId: string,
  ownerUid: string,
  input: VendorOnboardingDraftInput
): Promise<void> {
  if (!isFirebaseConfigured()) return

  const vendor = await getVendor(vendorId)
  if (!vendor) throw new Error("Vendor profile not found")
  if (vendor.ownerUid !== ownerUid) {
    throw new Error("Not authorized to update this vendor")
  }
  if (vendor.verificationStatus === "verified") {
    throw new Error("Verified vendors edit listing details from Profile")
  }

  const patch: Record<string, unknown> = {}
  if (input.businessName !== undefined) {
    const name = input.businessName.trim()
    if (name.length < 2) throw new Error("Business name is required")
    patch.businessName = name
  }
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId
  if (input.city !== undefined) {
    const city = input.city.trim()
    if (city.length < 2) throw new Error("City is required")
    patch.city = city
  }
  if (input.phone !== undefined) patch.phone = input.phone.trim()
  if (input.email !== undefined) {
    patch.email = input.email?.trim() ? input.email.trim() : deleteField()
  }
  if (input.bio !== undefined) patch.bio = input.bio.trim()
  if (input.startingPrice !== undefined) {
    if (!Number.isFinite(input.startingPrice) || input.startingPrice < 0) {
      throw new Error("Enter a valid starting price")
    }
    patch.startingPrice = Math.round(input.startingPrice)
  }
  if (input.pricingNotes !== undefined) {
    patch.pricingNotes = input.pricingNotes?.trim()
      ? input.pricingNotes.trim().slice(0, 1000)
      : deleteField()
  }
  if (input.availableFor !== undefined) {
    const events = input.availableFor.filter((e) => ALL_EVENTS.includes(e))
    if (events.length === 0) throw new Error("Select at least one event type")
    patch.availableFor = events
  }
  if (input.photoUrls !== undefined) {
    patch.photoUrls = input.photoUrls.filter(
      (u) => typeof u === "string" && u.length > 0
    ).slice(0, 8)
  }
  if (input.coverPhotoUrl !== undefined) {
    patch.coverPhotoUrl = input.coverPhotoUrl?.trim()
      ? input.coverPhotoUrl.trim()
      : deleteField()
  }
  if (input.onboardingStep !== undefined) {
    const step = Math.min(4, Math.max(1, Math.round(input.onboardingStep)))
    patch.onboardingStep = step
  }

  if (Object.keys(patch).length === 0) return
  await updateDoc(doc(getFirestoreDb(), "vendors", vendorId), patch)

  if (input.email !== undefined) {
    await updateUserContactEmail(
      getFirestoreDb(),
      ownerUid,
      input.email?.trim() ? input.email.trim() : null
    )
  }
}

export type SubmitVendorOnboardingInput = {
  cnic: string
  businessName: string
  city: string
  categoryId: VendorCategoryId
  phone: string
  email?: string
  bio: string
  startingPrice: number
  pricingNotes?: string
  availableFor: EventId[]
  photoUrls: string[]
  coverPhotoUrl?: string
}

/**
 * Final onboarding submit — saves listing fields, writes KYC, sets pending review.
 * Allowed from draft/unverified, rejected, or already-pending (refresh submission).
 */
export async function submitVendorOnboarding(
  vendorId: string,
  ownerUid: string,
  input: SubmitVendorOnboardingInput
): Promise<VendorVerificationStatus> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }

  const cnic = sanitizeCnic(input.cnic)
  const businessName = input.businessName.trim()
  const city = input.city.trim()
  const bio = input.bio.trim()
  const events = input.availableFor.filter((e) => ALL_EVENTS.includes(e))

  if (!isValidCnicInput(cnic)) {
    throw new Error("Enter a valid CNIC / ID number (5–20 characters)")
  }
  if (businessName.length < 2) throw new Error("Business name is required")
  if (city.length < 2) throw new Error("City is required")
  if (bio.length < 20) {
    throw new Error("Add a short description (at least 20 characters)")
  }
  if (!Number.isFinite(input.startingPrice) || input.startingPrice < 0) {
    throw new Error("Enter a valid starting price")
  }
  if (events.length === 0) throw new Error("Select at least one event type")
  if (input.photoUrls.length < 1) {
    throw new Error("Upload at least one portfolio photo")
  }

  const vendor = await getVendor(vendorId)
  if (!vendor) throw new Error("Vendor profile not found")
  if (vendor.ownerUid !== ownerUid) {
    throw new Error("Not authorized to update this vendor")
  }
  if (vendor.verificationStatus === "verified") {
    throw new Error("This vendor is already verified")
  }

  const now = Date.now()
  const photoUrls = input.photoUrls.filter((u) => u.length > 0).slice(0, 8)

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
    businessName,
    categoryId: input.categoryId,
    city,
    phone: input.phone.trim(),
    bio,
    startingPrice: Math.round(input.startingPrice),
    pricingNotes: input.pricingNotes?.trim()
      ? input.pricingNotes.trim().slice(0, 1000)
      : deleteField(),
    availableFor: events,
    photoUrls,
    coverPhotoUrl: input.coverPhotoUrl?.trim()
      ? input.coverPhotoUrl.trim()
      : photoUrls[0] ?? deleteField(),
    email: input.email?.trim() ? input.email.trim() : deleteField(),
    onboardingStatus: "pending_review",
    onboardingStep: 4,
    verificationStatus: "pending",
    verificationCnic: deleteField(),
    verificationBusinessName: businessName,
    verificationCity: city,
    verificationSubmittedAt: now,
    verificationRejectionReason: deleteField(),
  })

  if (input.email !== undefined) {
    await updateUserContactEmail(
      getFirestoreDb(),
      ownerUid,
      input.email?.trim() ? input.email.trim() : null
    )
  }

  return "pending"
}

export type SubmitVendorVerificationInput = {
  cnic: string
  businessName: string
  city: string
}

/**
 * Vendor submits / resubmits identity details for manual admin review.
 * Sets status to pending; cannot self-approve.
 * Allowed while pending so vendors can correct details flagged in review.
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
    onboardingStatus: "pending_review",
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

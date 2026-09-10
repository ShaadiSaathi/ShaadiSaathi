import {
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { apiJson, authenticatedFetch } from "@/src/lib/auth-fetch"
import { getFirestoreDb } from "@/src/lib/firebase"
import type { EventId, InviteThemeId, SeatingAssignment } from "@/src/lib/types"

export type WeddingAiReply = {
  reply: string
  citations?: Array<{ url?: string; title?: string }>
  usage?: {
    used: number
    limit: number
    remaining: number
  }
  error?: string
  code?: string
}

export async function askWeddingAi(message: string): Promise<WeddingAiReply> {
  return apiJson<WeddingAiReply>("/api/wedding-chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}

export async function getWeddingAiUsage(): Promise<{
  usage: {
    used: number
    limit: number
    remaining: number
    dateKey?: string
  }
}> {
  return apiJson("/api/wedding-chat/usage")
}

export async function exportWeddingPlanPdf(): Promise<ArrayBuffer> {
  const res = await authenticatedFetch("/api/wedding-plan/export", {
    method: "POST",
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Export failed (${res.status})`)
  }
  return res.arrayBuffer()
}

export async function createDepositPayment(input: {
  bookingId: string
  weddingId: string
  vendorId: string
  amountPkr: number
  totalPrice: number
  eventId: string
  familyName?: string
  weddingName?: string
  vendorName?: string
  packageName?: string
}): Promise<{
  clientSecret: string
  paymentIntentId: string
  publishableKey: string
  amountPkr: number
}> {
  return apiJson("/api/payments/deposit/create", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      paymentPath: "online",
    }),
  })
}

export async function completeDepositPayment(input: {
  bookingId: string
  paymentIntentId: string
}): Promise<void> {
  await apiJson("/api/payments/deposit/complete", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createBalancePayment(bookingId: string): Promise<{
  clientSecret: string
  paymentIntentId: string
  publishableKey: string
}> {
  return apiJson("/api/payments/balance/create", {
    method: "POST",
    body: JSON.stringify({ bookingId }),
  })
}

export async function createAiTopup(): Promise<{
  clientSecret: string
  paymentIntentId: string
  publishableKey: string
  questions?: number
}> {
  return apiJson("/api/payments/ai-topup/create", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function completeAiTopup(paymentIntentId: string): Promise<void> {
  await apiJson("/api/payments/ai-topup/complete", {
    method: "POST",
    body: JSON.stringify({ paymentIntentId }),
  })
}

export async function updateWeddingInviteTheme(
  weddingId: string,
  inviteTheme: InviteThemeId
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "weddings", weddingId), { inviteTheme })
}

export async function updateWeddingSeating(
  weddingId: string,
  seatingAssignments: SeatingAssignment[]
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "weddings", weddingId), {
    seatingAssignments,
  })
}

export async function setWeddingPremium(
  weddingId: string,
  isPremium: boolean
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "weddings", weddingId), { isPremium })
}

export async function setVendorFeatured(
  vendorId: string,
  featured: boolean
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "vendors", vendorId), {
    subscriptionTier: featured ? "featured" : "basic",
    featuredBoost: featured,
  })
}

export async function saveVendorProfile(input: {
  vendorId: string
  ownerUid: string
  businessName: string
  categoryId: string
  city: string
  phone: string
  bio: string
  startingPrice: number
  availableFor: EventId[]
  email?: string
  pricingNotes?: string
  cnic: string
  photoUrls: string[]
}): Promise<void> {
  const now = Date.now()
  const photoUrls = input.photoUrls.filter(Boolean).slice(0, 12)
  if (photoUrls.length < 1) throw new Error("Upload at least one portfolio photo")
  if (input.bio.trim().length < 20) {
    throw new Error("Add a short description (at least 20 characters)")
  }
  if (input.cnic.trim().length < 5) {
    throw new Error("Enter a valid CNIC / ID number")
  }
  const portfolioItems = photoUrls.map((url, i) => ({
    id: `m_${now}_${i}`,
    url,
    createdAt: now,
  }))
  await updateDoc(doc(getFirestoreDb(), "vendors", input.vendorId), {
    businessName: input.businessName.trim(),
    categoryId: input.categoryId,
    city: input.city.trim(),
    phone: input.phone.trim(),
    bio: input.bio.trim(),
    startingPrice: Math.round(input.startingPrice),
    availableFor: input.availableFor,
    photoUrls,
    portfolioItems,
    coverPhotoUrl: photoUrls[0] ?? null,
    email: input.email?.trim() || null,
    pricingNotes: input.pricingNotes?.trim() || null,
    onboardingStatus: "pending_review",
    onboardingStep: 4,
    verificationStatus: "pending",
    verificationBusinessName: input.businessName.trim(),
    verificationCity: input.city.trim(),
    verificationSubmittedAt: now,
  })
  await setDoc(
    doc(getFirestoreDb(), "vendor_kyc", input.vendorId),
    {
      vendorId: input.vendorId,
      ownerUid: input.ownerUid,
      verificationCnic: input.cnic.trim(),
      verificationBusinessName: input.businessName.trim(),
      verificationCity: input.city.trim(),
      submittedAt: now,
      updatedAt: now,
    },
    { merge: true }
  )
}

export async function saveVendorPayoutAccount(input: {
  vendorId: string
  ownerUid: string
  iban: string
  accountHolderName: string
  bankName: string
}): Promise<void> {
  await setDoc(
    doc(getFirestoreDb(), "vendor_payout_accounts", input.vendorId),
    {
      vendorId: input.vendorId,
      ownerUid: input.ownerUid,
      iban: input.iban.trim(),
      accountHolderName: input.accountHolderName.trim(),
      bankName: input.bankName.trim(),
      updatedAt: Date.now(),
    },
    { merge: true }
  )
}

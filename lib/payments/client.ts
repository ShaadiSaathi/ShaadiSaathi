/**
 * Browser helpers for payment APIs. Never import Stripe secret logic here.
 */

import { getFirebaseAuth } from "@/lib/firebase/config"
import type { PaymentsAvailability } from "./types"
import { PAYMENTS_UNAVAILABLE_MESSAGE } from "./types"

async function paymentFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    throw new Error("Sign in to continue with payment")
  }
  const token = await user.getIdToken()
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  })
}

export async function fetchPaymentsStatus(): Promise<PaymentsAvailability> {
  const res = await fetch("/api/payments/status", { cache: "no-store" })
  if (!res.ok) {
    return {
      stripe: false,
      safepay: false,
      canCollect: false,
      canPayout: false,
      mode: "unconfigured",
      message: PAYMENTS_UNAVAILABLE_MESSAGE,
      publishableKey: null,
      currency: "pkr",
    }
  }
  return (await res.json()) as PaymentsAvailability
}

export type CreateDepositIntentBody = {
  bookingId: string
  weddingId: string
  vendorId: string
  amountPkr: number
  totalPrice: number
  paymentPath: "in_person" | "online"
  inPersonMethod?: "cash" | "card"
  packageName?: string
  guestCount?: number
  note?: string
  eventId: string
  familyName: string
  weddingName: string
  vendorName: string
}

export type CreateDepositIntentResponse = {
  clientSecret: string
  paymentIntentId: string
  publishableKey: string
  currency: string
  amountPkr: number
}

export async function createDepositIntent(
  body: CreateDepositIntentBody
): Promise<CreateDepositIntentResponse> {
  const res = await paymentFetch("/api/payments/deposit/create", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
  } & Partial<CreateDepositIntentResponse>
  if (!res.ok) {
    throw new Error(data.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  if (!data.clientSecret || !data.paymentIntentId || !data.publishableKey) {
    throw new Error(PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  return data as CreateDepositIntentResponse
}

export async function completeDepositBooking(body: {
  bookingId: string
  paymentIntentId: string
}): Promise<void> {
  const res = await paymentFetch("/api/payments/deposit/complete", {
    method: "POST",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not confirm deposit payment")
  }
}

export async function createBalanceIntent(body: {
  bookingId: string
}): Promise<CreateDepositIntentResponse> {
  const res = await paymentFetch("/api/payments/balance/create", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
  } & Partial<CreateDepositIntentResponse>
  if (!res.ok) {
    throw new Error(data.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  if (!data.clientSecret || !data.paymentIntentId || !data.publishableKey) {
    throw new Error(PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  return data as CreateDepositIntentResponse
}

export type CreateAiTopUpIntentResponse = {
  clientSecret: string
  paymentIntentId: string
  publishableKey: string
  currency: string
  amountMajor: number
  questions: number
}

export type WeddingAiUsageClient = {
  weddingId: string
  dateKey: string
  used: number
  baseLimit: number
  bonusAllowance: number
  limit: number
  remaining: number
}

export async function createAiTopUpIntent(): Promise<CreateAiTopUpIntentResponse> {
  const res = await paymentFetch("/api/payments/ai-topup/create", {
    method: "POST",
    body: JSON.stringify({}),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
  } & Partial<CreateAiTopUpIntentResponse>
  if (!res.ok) {
    throw new Error(data.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  if (!data.clientSecret || !data.paymentIntentId || !data.publishableKey) {
    throw new Error(PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  return data as CreateAiTopUpIntentResponse
}

export async function completeAiTopUp(body: {
  paymentIntentId: string
}): Promise<WeddingAiUsageClient> {
  const res = await paymentFetch("/api/payments/ai-topup/complete", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    usage?: WeddingAiUsageClient
  }
  if (!res.ok) {
    throw new Error(data.message ?? "Could not confirm Wedding AI top-up")
  }
  if (!data.usage) {
    throw new Error("Top-up succeeded but usage was not returned")
  }
  return data.usage
}

export async function captureBookingDeposit(bookingId: string): Promise<void> {
  const res = await paymentFetch("/api/payments/deposit/capture", {
    method: "POST",
    body: JSON.stringify({ bookingId }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not capture deposit")
  }
}

/** Uses the vendor's stored IBAN — never send bank details from the client. */
export async function payoutBookingVendor(body: {
  bookingId: string
}): Promise<{
  ok: boolean
  status?: string | null
  message?: string
  payoutUnavailable?: boolean
}> {
  const res = await paymentFetch("/api/payments/payout", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    status?: string
    ok?: boolean
    payoutUnavailable?: boolean
  }
  if (!res.ok) {
    throw new Error(data.message ?? PAYMENTS_UNAVAILABLE_MESSAGE)
  }
  return {
    ok: data.ok !== false,
    status: data.status ?? null,
    message: data.message,
    payoutUnavailable: data.payoutUnavailable,
  }
}

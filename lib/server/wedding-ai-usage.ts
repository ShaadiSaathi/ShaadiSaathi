/**
 * Per-wedding daily Wedding AI question quotas (Admin SDK only).
 * Calendar day in UTC — doc id `{weddingId}_{YYYY-MM-DD}`.
 */

import { getAdminDb } from "@/lib/server/firebase-admin"
import {
  WEDDING_AI_BASE_DAILY_LIMIT,
  WEDDING_AI_TOPUP_QUESTIONS,
} from "@/lib/wedding-ai-limits"

export {
  WEDDING_AI_BASE_DAILY_LIMIT,
  WEDDING_AI_TOPUP_AMOUNT_MAJOR,
  WEDDING_AI_TOPUP_CURRENCY,
  WEDDING_AI_TOPUP_QUESTIONS,
} from "@/lib/wedding-ai-limits"

const COLLECTION = "weddingAiUsage"

export type WeddingAiUsageSnapshot = {
  weddingId: string
  dateKey: string
  used: number
  baseLimit: number
  bonusAllowance: number
  limit: number
  remaining: number
}

export class WeddingAiLimitError extends Error {
  readonly status = 429
  readonly code = "DAILY_LIMIT" as const
  readonly usage: WeddingAiUsageSnapshot

  constructor(usage: WeddingAiUsageSnapshot) {
    super(
      `Daily Wedding AI limit reached (${usage.used} of ${usage.limit} questions used today).`
    )
    this.name = "WeddingAiLimitError"
    this.usage = usage
  }
}

type UsageDoc = {
  weddingId?: string
  dateKey?: string
  used?: number
  bonusAllowance?: number
  appliedPaymentIntentIds?: string[]
  updatedAt?: number
}

/** UTC calendar date key, e.g. 2026-08-14 */
export function weddingAiUtcDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function weddingAiUsageDocId(weddingId: string, dateKey = weddingAiUtcDateKey()): string {
  return `${weddingId}_${dateKey}`
}

function toSnapshot(
  weddingId: string,
  dateKey: string,
  used: number,
  bonusAllowance: number
): WeddingAiUsageSnapshot {
  const limit = WEDDING_AI_BASE_DAILY_LIMIT + Math.max(0, bonusAllowance)
  const safeUsed = Math.max(0, used)
  return {
    weddingId,
    dateKey,
    used: safeUsed,
    baseLimit: WEDDING_AI_BASE_DAILY_LIMIT,
    bonusAllowance: Math.max(0, bonusAllowance),
    limit,
    remaining: Math.max(0, limit - safeUsed),
  }
}

function readFields(data: UsageDoc | undefined): {
  used: number
  bonusAllowance: number
  appliedPaymentIntentIds: string[]
} {
  return {
    used: typeof data?.used === "number" && data.used >= 0 ? data.used : 0,
    bonusAllowance:
      typeof data?.bonusAllowance === "number" && data.bonusAllowance >= 0
        ? data.bonusAllowance
        : 0,
    appliedPaymentIntentIds: Array.isArray(data?.appliedPaymentIntentIds)
      ? data.appliedPaymentIntentIds.filter((id): id is string => typeof id === "string")
      : [],
  }
}

export async function getWeddingAiUsage(
  weddingId: string
): Promise<WeddingAiUsageSnapshot> {
  const dateKey = weddingAiUtcDateKey()
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .doc(weddingAiUsageDocId(weddingId, dateKey))
    .get()
  const fields = readFields(snap.exists ? (snap.data() as UsageDoc) : undefined)
  return toSnapshot(weddingId, dateKey, fields.used, fields.bonusAllowance)
}

/**
 * Atomically consume one question slot before calling Anthropic.
 * Throws WeddingAiLimitError when the effective daily limit is already reached.
 */
export async function reserveWeddingAiUsageSlot(
  weddingId: string
): Promise<WeddingAiUsageSnapshot> {
  const dateKey = weddingAiUtcDateKey()
  const ref = getAdminDb()
    .collection(COLLECTION)
    .doc(weddingAiUsageDocId(weddingId, dateKey))

  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const fields = readFields(snap.exists ? (snap.data() as UsageDoc) : undefined)
    const snapshot = toSnapshot(
      weddingId,
      dateKey,
      fields.used,
      fields.bonusAllowance
    )
    if (fields.used >= snapshot.limit) {
      throw new WeddingAiLimitError(snapshot)
    }
    const nextUsed = fields.used + 1
    tx.set(
      ref,
      {
        weddingId,
        dateKey,
        used: nextUsed,
        bonusAllowance: fields.bonusAllowance,
        appliedPaymentIntentIds: fields.appliedPaymentIntentIds,
        updatedAt: Date.now(),
      },
      { merge: true }
    )
    return toSnapshot(weddingId, dateKey, nextUsed, fields.bonusAllowance)
  })
}

/** Roll back a reserved slot when Anthropic (or retrieval) fails after reserve. */
export async function releaseWeddingAiUsageSlot(weddingId: string): Promise<void> {
  const dateKey = weddingAiUtcDateKey()
  const ref = getAdminDb()
    .collection(COLLECTION)
    .doc(weddingAiUsageDocId(weddingId, dateKey))

  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const fields = readFields(snap.data() as UsageDoc)
    if (fields.used <= 0) return
    tx.update(ref, {
      used: fields.used - 1,
      updatedAt: Date.now(),
    })
  })
}

/**
 * Add purchased questions for today. Idempotent per Stripe PaymentIntent id.
 * Returns the updated usage snapshot.
 */
export async function applyWeddingAiTopUp(input: {
  weddingId: string
  paymentIntentId: string
  questions?: number
  dateKey?: string
}): Promise<{ usage: WeddingAiUsageSnapshot; alreadyApplied: boolean }> {
  const dateKey = input.dateKey ?? weddingAiUtcDateKey()
  const questions = input.questions ?? WEDDING_AI_TOPUP_QUESTIONS
  if (questions < 1 || questions > 500) {
    throw new Error("Invalid top-up question count")
  }

  const ref = getAdminDb()
    .collection(COLLECTION)
    .doc(weddingAiUsageDocId(input.weddingId, dateKey))

  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const fields = readFields(snap.exists ? (snap.data() as UsageDoc) : undefined)
    if (fields.appliedPaymentIntentIds.includes(input.paymentIntentId)) {
      return {
        usage: toSnapshot(
          input.weddingId,
          dateKey,
          fields.used,
          fields.bonusAllowance
        ),
        alreadyApplied: true,
      }
    }

    const nextBonus = fields.bonusAllowance + questions
    const nextIds = [...fields.appliedPaymentIntentIds, input.paymentIntentId]
    tx.set(
      ref,
      {
        weddingId: input.weddingId,
        dateKey,
        used: fields.used,
        bonusAllowance: nextBonus,
        appliedPaymentIntentIds: nextIds,
        updatedAt: Date.now(),
      },
      { merge: true }
    )
    return {
      usage: toSnapshot(input.weddingId, dateKey, fields.used, nextBonus),
      alreadyApplied: false,
    }
  })
}

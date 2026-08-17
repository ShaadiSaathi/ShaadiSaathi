import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import type { InviteThemeId } from "@/lib/premium"
import { normalizeWeddingPlanningPreferences } from "@/lib/wedding-preferences"
import type { WeddingPlanningPreferences } from "@/lib/wedding-preferences"
import { getFirestoreDb } from "./config"
import type { FirestoreWedding } from "./types"

/** Generate a fresh, never-reused auto-ID for a new wedding document. */
export function newWeddingId(): string {
  return doc(collection(getFirestoreDb(), "weddings")).id
}

export async function getWedding(weddingId: string): Promise<FirestoreWedding | null> {
  const snap = await getDoc(doc(getFirestoreDb(), "weddings", weddingId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreWedding
}

export function subscribeWedding(
  weddingId: string,
  onData: (wedding: FirestoreWedding | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(getFirestoreDb(), "weddings", weddingId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData({ id: snap.id, ...snap.data() } as FirestoreWedding)
    },
    (err) => onError?.(err)
  )
}

export async function createWedding(
  wedding: Omit<FirestoreWedding, "createdAt">
): Promise<void> {
  await setDoc(doc(getFirestoreDb(), "weddings", wedding.id), {
    ...wedding,
    createdAt: Date.now(),
  })
}

export async function updateWeddingPremium(
  weddingId: string,
  isPremium: boolean
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "weddings", weddingId), { isPremium })
}

export async function updateWeddingInviteTheme(
  weddingId: string,
  inviteTheme: InviteThemeId
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "weddings", weddingId), { inviteTheme })
}

export async function updateWeddingEventOverride(
  weddingId: string,
  eventId: string,
  override: {
    date?: string
    time?: string
    rsvpLockHoursBefore?: number | null
  }
): Promise<void> {
  const ref = doc(getFirestoreDb(), "weddings", weddingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("Wedding not found")
  const existing = (snap.data().eventOverrides ?? {}) as Record<string, unknown>
  const prev =
    typeof existing[eventId] === "object" && existing[eventId] !== null
      ? (existing[eventId] as Record<string, unknown>)
      : {}
  await updateDoc(ref, {
    eventOverrides: {
      ...existing,
      [eventId]: {
        ...prev,
        ...override,
      },
    },
  })
}

/**
 * Owner grants or revokes elevated financial permission for a collaborator.
 * Owner is always implied and must not be stored in paymentApproverUids.
 */
export async function updateWeddingPlanningPreferences(
  weddingId: string,
  preferences: WeddingPlanningPreferences | null
): Promise<void> {
  const normalized = normalizeWeddingPlanningPreferences(preferences)
  const ref = doc(getFirestoreDb(), "weddings", weddingId)
  if (!normalized) {
    await updateDoc(ref, { planningPreferences: null })
    return
  }
  await updateDoc(ref, { planningPreferences: normalized })
}

export async function setWeddingPaymentApprover(
  weddingId: string,
  collaboratorUid: string,
  allowed: boolean
): Promise<void> {
  const ref = doc(getFirestoreDb(), "weddings", weddingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("Wedding not found")
  const data = snap.data() as FirestoreWedding
  if (collaboratorUid === data.ownerId) {
    throw new Error("The wedding owner already has full payment access.")
  }
  if (!(data.memberUids ?? []).includes(collaboratorUid)) {
    throw new Error("Only wedding members can receive payment access.")
  }

  const current = new Set(data.paymentApproverUids ?? [])
  if (allowed) current.add(collaboratorUid)
  else current.delete(collaboratorUid)

  await updateDoc(ref, {
    paymentApproverUids: Array.from(current),
  })
}

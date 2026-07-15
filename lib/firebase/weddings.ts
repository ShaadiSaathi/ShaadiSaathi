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

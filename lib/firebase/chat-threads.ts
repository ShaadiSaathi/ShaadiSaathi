import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { getFirebaseAuth, getFirestoreDb } from "./config"
import type { ChatThreadType, FirestoreChatThread } from "./types"

export function inquiryThreadId(weddingId: string, vendorId: string): string {
  return `inq_${weddingId}_${vendorId}`
}

export function consultThreadId(weddingId: string, vendorId: string): string {
  return `consult_${weddingId}_${vendorId}`
}

export async function getChatThread(threadId: string): Promise<FirestoreChatThread | null> {
  const snap = await getDoc(doc(getFirestoreDb(), "chatThreads", threadId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreChatThread
}

/** Creates the thread if missing; returns the thread id. */
export async function ensureChatThread(input: {
  type: ChatThreadType
  weddingId: string
  vendorId: string
  vendorName: string
}): Promise<string> {
  const id =
    input.type === "vendor_inquiry"
      ? inquiryThreadId(input.weddingId, input.vendorId)
      : consultThreadId(input.weddingId, input.vendorId)

  const ref = doc(getFirestoreDb(), "chatThreads", id)
  const existing = await getDoc(ref)
  if (existing.exists()) return id

  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("Sign in to start a conversation")
  const now = Date.now()
  const thread: FirestoreChatThread = {
    id,
    type: input.type,
    weddingId: input.weddingId,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    createdByUid: uid,
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(ref, thread)
  return id
}

export async function touchChatThread(
  threadId: string,
  preview: string
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "chatThreads", threadId), {
    updatedAt: Date.now(),
    lastMessageAt: Date.now(),
    lastMessagePreview: preview.slice(0, 140),
  })
}

export function subscribeChatThread(
  threadId: string,
  onData: (thread: FirestoreChatThread | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(getFirestoreDb(), "chatThreads", threadId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData({ id: snap.id, ...snap.data() } as FirestoreChatThread)
    },
    (err) => onError?.(err)
  )
}

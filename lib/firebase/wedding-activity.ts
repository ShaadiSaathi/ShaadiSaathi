"use client"

import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { getFirestoreDb } from "./config"

export type WeddingActivityAction =
  | "guest_updated"
  | "task_updated"
  | "event_updated"
  | "financial_action_attempt"
  | "collaborator_invited"
  | "collaborator_joined"
  | "collaborator_removed"
  | "collaborator_role_changed"

export interface FirestoreWeddingActivity {
  id: string
  weddingId: string
  actorUid: string
  actorName: string
  action: WeddingActivityAction
  /** e.g. guest invite token, task id, booking id */
  targetId?: string
  /** Short human-readable detail */
  summary: string
  createdAt: number
}

export async function appendWeddingActivity(input: {
  weddingId: string
  actorUid: string
  actorName: string
  action: WeddingActivityAction
  targetId?: string
  summary: string
}): Promise<void> {
  const ref = collection(getFirestoreDb(), "wedding_activity")
  await addDoc(ref, {
    weddingId: input.weddingId,
    actorUid: input.actorUid,
    actorName: input.actorName.slice(0, 80),
    action: input.action,
    ...(input.targetId ? { targetId: input.targetId.slice(0, 128) } : {}),
    summary: input.summary.slice(0, 240),
    createdAt: Date.now(),
  })
}

export function subscribeWeddingActivity(
  weddingId: string,
  onData: (entries: FirestoreWeddingActivity[]) => void,
  onError?: (error: Error) => void,
  maxEntries = 50
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), "wedding_activity"),
    where("weddingId", "==", weddingId),
    orderBy("createdAt", "desc"),
    limit(maxEntries)
  )
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as FirestoreWeddingActivity
      )
      onData(entries)
    },
    (err) => onError?.(err)
  )
}

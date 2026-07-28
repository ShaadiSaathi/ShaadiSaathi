import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore"
import { getFirestoreDb } from "./config"
import type { FirestoreNotification, NotificationType } from "./types"

export type AppNotification = FirestoreNotification

function toAppNotification(data: FirestoreNotification): AppNotification {
  return {
    id: data.id,
    recipientUid: data.recipientUid,
    weddingId: data.weddingId,
    type: data.type,
    message: data.message,
    taskId: data.taskId,
    read: data.read,
    createdAt: data.createdAt,
    ...(data.actorUid ? { actorUid: data.actorUid } : {}),
    ...(data.actorName ? { actorName: data.actorName } : {}),
  }
}

export function formatTaskAssignedMessage(actorName: string, title: string, dueDate?: string): string {
  const actor = actorName.trim() || "Someone"
  const taskTitle = title.trim() || "a task"
  if (dueDate) {
    return `${actor} assigned you a task: '${taskTitle}' (due ${dueDate})`
  }
  return `${actor} assigned you a task: '${taskTitle}'`
}

export function formatTaskDueSoonMessage(title: string, dueDate: string): string {
  const taskTitle = title.trim() || "a task"
  return `Reminder: '${taskTitle}' is due soon (${dueDate})`
}

export async function createNotification(input: {
  recipientUid: string
  weddingId: string
  type: NotificationType
  message: string
  taskId: string
  actorUid?: string
  actorName?: string
}): Promise<string> {
  const ref = doc(collection(getFirestoreDb(), "notifications"))
  const notification: FirestoreNotification = {
    id: ref.id,
    recipientUid: input.recipientUid,
    weddingId: input.weddingId,
    type: input.type,
    message: input.message,
    taskId: input.taskId,
    read: false,
    createdAt: Date.now(),
    ...(input.actorUid ? { actorUid: input.actorUid } : {}),
    ...(input.actorName ? { actorName: input.actorName } : {}),
  }
  await setDoc(ref, notification)
  return ref.id
}

/** Creates a task_assigned notification unless the assignee is the actor. */
export async function notifyTaskAssigned(input: {
  recipientUid: string
  weddingId: string
  taskId: string
  taskTitle: string
  dueDate?: string
  actorUid: string
  actorName: string
}): Promise<string | null> {
  if (!input.recipientUid || input.recipientUid === input.actorUid) return null
  return createNotification({
    recipientUid: input.recipientUid,
    weddingId: input.weddingId,
    type: "task_assigned",
    message: formatTaskAssignedMessage(input.actorName, input.taskTitle, input.dueDate),
    taskId: input.taskId,
    actorUid: input.actorUid,
    actorName: input.actorName,
  })
}

export function subscribeNotificationsForUser(
  uid: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), "notifications"),
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) =>
        toAppNotification({ id: d.id, ...d.data() } as FirestoreNotification)
      )
      onData(list)
    },
    (err) => onError?.(err)
  )
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "notifications", notificationId), { read: true })
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return
  const db = getFirestoreDb()
  const batch = writeBatch(db)
  for (const id of notificationIds) {
    batch.update(doc(db, "notifications", id), { read: true })
  }
  await batch.commit()
}

/** Used by scheduled jobs / tests to avoid duplicate due-soon alerts. */
export async function hasDueSoonNotification(taskId: string, recipientUid: string): Promise<boolean> {
  const q = query(
    collection(getFirestoreDb(), "notifications"),
    where("taskId", "==", taskId),
    where("recipientUid", "==", recipientUid),
    where("type", "==", "task_due_soon"),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

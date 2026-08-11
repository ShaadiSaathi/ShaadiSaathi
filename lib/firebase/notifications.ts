/**
 * Single entry-point for creating in-app notifications.
 *
 * Architecture note for future FCM push: add push delivery as a side-effect
 * inside createNotification / createNotificationAdmin (or a shared helper both
 * call) — callers should never duplicate inbox writes.
 */

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
import type {
  FirestoreNotification,
  NotificationPriority,
  NotificationType,
} from "./types"

export type AppNotification = FirestoreNotification

export type CreateNotificationInput = {
  recipientUid: string
  weddingId: string
  type: NotificationType
  message: string
  taskId?: string
  bookingId?: string
  vendorId?: string
  threadId?: string
  href?: string
  priority?: NotificationPriority
  actorUid?: string
  actorName?: string
}

function toAppNotification(data: FirestoreNotification): AppNotification {
  return {
    id: data.id,
    recipientUid: data.recipientUid,
    weddingId: data.weddingId,
    type: data.type,
    message: data.message,
    read: data.read,
    createdAt: data.createdAt,
    ...(data.taskId ? { taskId: data.taskId } : {}),
    ...(data.bookingId ? { bookingId: data.bookingId } : {}),
    ...(data.vendorId ? { vendorId: data.vendorId } : {}),
    ...(data.threadId ? { threadId: data.threadId } : {}),
    ...(data.href ? { href: data.href } : {}),
    ...(data.priority ? { priority: data.priority } : {}),
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

export function formatBookingRequestMessage(
  familyName: string,
  weddingName: string,
  eventLabel: string
): string {
  const family = familyName.trim() || "A family"
  const wedding = weddingName.trim() || "their wedding"
  return `${family} sent a booking request for ${eventLabel} (${wedding})`
}

export function formatQuoteReceivedMessage(
  vendorName: string,
  weddingName: string,
  priceLabel: string
): string {
  const vendor = vendorName.trim() || "A vendor"
  const wedding = weddingName.trim() || "your wedding"
  return `${vendor} sent a quote of ${priceLabel} for ${wedding}`
}

export function formatQuoteDecisionMessage(
  familyName: string,
  weddingName: string,
  accepted: boolean
): string {
  const family = familyName.trim() || "The family"
  const wedding = weddingName.trim() || "their wedding"
  return accepted
    ? `${family} accepted your quote for ${wedding}`
    : `${family} declined your quote for ${wedding}`
}

export function formatExtraWorkNeededMessage(
  vendorName: string,
  weddingName: string,
  eventLabel: string
): string {
  const vendor = vendorName.trim() || "Your vendor"
  const wedding = weddingName.trim() || "your wedding"
  return `URGENT: ${vendor} requested extra work approval for ${eventLabel} (${wedding})`
}

export function formatDisputeRaisedMessage(
  familyName: string,
  weddingName: string,
  eventLabel: string
): string {
  const family = familyName.trim() || "A family"
  const wedding = weddingName.trim() || "their wedding"
  return `${family} raised a dispute on ${eventLabel} (${wedding})`
}

export function formatDisputeVendorResponseMessage(
  vendorName: string,
  weddingName: string,
  eventLabel: string
): string {
  const vendor = vendorName.trim() || "The vendor"
  const wedding = weddingName.trim() || "your wedding"
  return `${vendor} responded to the dispute on ${eventLabel} (${wedding})`
}

/**
 * Create one inbox notification for a recipient.
 * Prefer this (or the Admin SDK twin) from every product trigger so push can
 * later hook a single place.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string> {
  const ref = doc(collection(getFirestoreDb(), "notifications"))
  const message = input.message.trim().slice(0, 500)
  if (!input.recipientUid || !input.weddingId || !message) {
    throw new Error("Notification requires recipient, wedding, and message")
  }

  const notification: FirestoreNotification = {
    id: ref.id,
    recipientUid: input.recipientUid,
    weddingId: input.weddingId,
    type: input.type,
    message,
    read: false,
    createdAt: Date.now(),
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    ...(input.vendorId ? { vendorId: input.vendorId } : {}),
    ...(input.threadId ? { threadId: input.threadId } : {}),
    ...(input.href ? { href: input.href } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
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
    href: `/tasks#task-${input.taskId}`,
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

/** Default in-app path for a notification (family vs vendor portals). */
export function resolveNotificationHref(
  item: AppNotification,
  portal: "family" | "vendor"
): string {
  if (item.href) return item.href
  if (item.taskId) return `/tasks#task-${item.taskId}`
  if (item.threadId) {
    return portal === "vendor"
      ? `/vendor/inquiries/${item.threadId}`
      : item.vendorId
        ? `/vendors/${item.vendorId}/messages`
        : "/vendors"
  }
  if (item.bookingId) {
    return portal === "vendor"
      ? `/vendor/jobs/${item.bookingId}/messages`
      : `/vendors/bookings/${item.bookingId}/messages`
  }
  return portal === "vendor" ? "/vendor/requests" : "/vendors/bookings"
}

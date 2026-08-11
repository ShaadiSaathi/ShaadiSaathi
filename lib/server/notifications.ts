/**
 * Admin-SDK twin of createNotification.
 * Use from API routes / Cloud Functions. Future FCM push should hook here too.
 */

import { getAdminDb } from "@/lib/server/firebase-admin"
import type {
  FirestoreNotification,
  NotificationPriority,
  NotificationType,
} from "@/lib/firebase/types"

export type AdminCreateNotificationInput = {
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

export async function createNotificationAdmin(
  input: AdminCreateNotificationInput
): Promise<string | null> {
  const recipientUid = input.recipientUid?.trim()
  const weddingId = input.weddingId?.trim()
  const message = input.message?.trim().slice(0, 500)
  if (!recipientUid || !weddingId || !message) return null

  const ref = getAdminDb().collection("notifications").doc()
  const notification: FirestoreNotification = {
    id: ref.id,
    recipientUid,
    weddingId,
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
  await ref.set(notification)
  return ref.id
}

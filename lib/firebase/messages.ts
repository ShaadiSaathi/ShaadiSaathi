import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { getBooking } from "./bookings"
import { touchChatThread, getChatThread } from "./chat-threads"
import { getFirestoreDb } from "./config"
import { createNotification } from "./notifications"
import type { FirestoreMessage, FirestoreTypingState } from "./types"
import { getVendor } from "./vendors"
import { getWedding } from "./weddings"

export interface ChatMessage {
  id: string
  bookingId?: string
  threadId?: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  text: string
  imageUrl?: string
  timestamp: number
}

function mapMessage(id: string, data: FirestoreMessage): ChatMessage {
  return {
    id,
    ...(data.bookingId ? { bookingId: data.bookingId } : {}),
    ...(data.threadId ? { threadId: data.threadId } : {}),
    senderId: data.senderId,
    senderType: data.senderType,
    ...(data.senderName ? { senderName: data.senderName } : {}),
    text: data.text ?? "",
    ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    timestamp: data.timestamp,
  }
}

export function subscribeMessages(
  bookingId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), "messages"),
    where("bookingId", "==", bookingId),
    orderBy("timestamp", "asc")
  )
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapMessage(d.id, d.data() as FirestoreMessage)))
    },
    (err) => onError?.(err)
  )
}

export function subscribeThreadMessages(
  threadId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), "messages"),
    where("threadId", "==", threadId),
    orderBy("timestamp", "asc")
  )
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapMessage(d.id, d.data() as FirestoreMessage)))
    },
    (err) => onError?.(err)
  )
}

async function notifyBookingMessage(input: {
  bookingId: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  preview: string
}): Promise<void> {
  const booking = await getBooking(input.bookingId)
  if (!booking) return
  const actorName = input.senderName?.trim() || (input.senderType === "family" ? "Family" : "Vendor")
  const preview = input.preview.slice(0, 120)

  if (input.senderType === "family") {
    const vendor = await getVendor(booking.vendorId)
    if (!vendor?.ownerUid || vendor.ownerUid === input.senderId) return
    await createNotification({
      recipientUid: vendor.ownerUid,
      weddingId: booking.weddingId,
      type: "booking_message",
      message: `${actorName}: ${preview}`,
      bookingId: input.bookingId,
      href: `/vendor/jobs/${input.bookingId}/messages`,
      actorUid: input.senderId,
      actorName,
    })
    return
  }

  const recipients = [booking.createdByUid].filter(
    (uid): uid is string => Boolean(uid) && uid !== input.senderId
  )
  await Promise.all(
    recipients
      .map((uid) =>
        createNotification({
          recipientUid: uid,
          weddingId: booking.weddingId,
          type: "booking_message",
          message: `${actorName}: ${preview}`,
          bookingId: input.bookingId,
          href: `/vendors/bookings/${input.bookingId}/messages`,
          actorUid: input.senderId,
          actorName,
        })
      )
  )
}

async function notifyThreadMessage(input: {
  threadId: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  preview: string
}): Promise<void> {
  const thread = await getChatThread(input.threadId)
  if (!thread) return
  const actorName = input.senderName?.trim() || (input.senderType === "family" ? "Family" : "Vendor")
  const preview = input.preview.slice(0, 120)

  if (thread.type === "vendor_inquiry") {
    if (input.senderType === "family") {
      const vendor = await getVendor(thread.vendorId)
      if (!vendor?.ownerUid || vendor.ownerUid === input.senderId) return
      await createNotification({
        recipientUid: vendor.ownerUid,
        weddingId: thread.weddingId,
        type: "vendor_inquiry_message",
        message: `${actorName}: ${preview}`,
        vendorId: thread.vendorId,
        threadId: thread.id,
        href: `/vendor/inquiries/${thread.id}`,
        actorUid: input.senderId,
        actorName,
      })
      return
    }

    const recipients = [thread.createdByUid].filter(
      (uid): uid is string => Boolean(uid) && uid !== input.senderId
    )
    await Promise.all(
      recipients
        .map((uid) =>
          createNotification({
            recipientUid: uid,
            weddingId: thread.weddingId,
            type: "vendor_inquiry_message",
            message: `${actorName}: ${preview}`,
            vendorId: thread.vendorId,
            threadId: thread.id,
            href: `/vendors/${thread.vendorId}/messages`,
            actorUid: input.senderId,
            actorName,
          })
        )
    )
    return
  }

  // family_consult — notify other wedding members only
  const wedding = await getWedding(thread.weddingId)
  const members = wedding?.memberUids ?? []
  await Promise.all(
    members
      .filter((uid) => uid && uid !== input.senderId)
      .map((uid) =>
        createNotification({
          recipientUid: uid,
          weddingId: thread.weddingId,
          type: "family_consult_message",
          message: `${actorName} on ${thread.vendorName}: ${preview}`,
          vendorId: thread.vendorId,
          threadId: thread.id,
          href: `/vendors/${thread.vendorId}`,
          actorUid: input.senderId,
          actorName,
        })
      )
  )
}

export async function sendMessage(input: {
  bookingId?: string
  threadId?: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  text?: string
  imageUrl?: string
}): Promise<void> {
  const text = (input.text ?? "").trim()
  const imageUrl = input.imageUrl?.trim()
  if (!text && !imageUrl) {
    throw new Error("Message requires text or an image")
  }
  if (!input.bookingId && !input.threadId) {
    throw new Error("Message requires a booking or thread")
  }

  const payload: Record<string, unknown> = {
    senderId: input.senderId,
    senderType: input.senderType,
    text: text || (imageUrl ? "📷 Photo" : ""),
    timestamp: Date.now(),
  }
  if (input.bookingId) payload.bookingId = input.bookingId
  if (input.threadId) payload.threadId = input.threadId
  if (input.senderName?.trim()) payload.senderName = input.senderName.trim()
  if (imageUrl) payload.imageUrl = imageUrl

  await addDoc(collection(getFirestoreDb(), "messages"), payload)

  const preview = text || "Sent a photo"
  try {
    if (input.bookingId) {
      await notifyBookingMessage({
        bookingId: input.bookingId,
        senderId: input.senderId,
        senderType: input.senderType,
        senderName: input.senderName,
        preview,
      })
    } else if (input.threadId) {
      await touchChatThread(input.threadId, preview)
      await notifyThreadMessage({
        threadId: input.threadId,
        senderId: input.senderId,
        senderType: input.senderType,
        senderName: input.senderName,
        preview,
      })
    }
  } catch (err) {
    console.error("Failed to notify message recipients", err)
  }
}

export function subscribeTyping(
  scopeId: string,
  onData: (state: FirestoreTypingState | null) => void
): Unsubscribe {
  return onSnapshot(doc(getFirestoreDb(), "typing", scopeId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    onData(snap.data() as FirestoreTypingState)
  })
}

let typingTimeout: ReturnType<typeof setTimeout> | null = null

export async function setTyping(
  scopeId: string,
  role: "family" | "vendor",
  isTyping: boolean,
  meta?: { bookingId?: string; threadId?: string }
): Promise<void> {
  const field = role === "family" ? "familyTyping" : "vendorTyping"
  await setDoc(
    doc(getFirestoreDb(), "typing", scopeId),
    {
      ...(meta?.bookingId ? { bookingId: meta.bookingId } : {}),
      ...(meta?.threadId ? { threadId: meta.threadId } : {}),
      [field]: isTyping,
      updatedAt: Date.now(),
    },
    { merge: true }
  )

  if (typingTimeout) clearTimeout(typingTimeout)
  if (isTyping) {
    typingTimeout = setTimeout(() => {
      void setDoc(
        doc(getFirestoreDb(), "typing", scopeId),
        { [field]: false, updatedAt: Date.now() },
        { merge: true }
      )
    }, 3000)
  }
}

export async function markMessagesReadForRole(
  bookingId: string,
  role: "family" | "vendor"
): Promise<void> {
  const field = role === "family" ? "lastReadByFamily" : "lastReadByVendor"
  await updateDoc(doc(getFirestoreDb(), "bookings", bookingId), {
    [field]: Date.now(),
  })
}

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
import { getFirestoreDb } from "./config"
import type { FirestoreMessage, FirestoreTypingState } from "./types"

export interface ChatMessage {
  id: string
  bookingId: string
  senderId: string
  senderType: "family" | "vendor"
  text: string
  timestamp: number
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
      const messages = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ChatMessage
      )
      onData(messages)
    },
    (err) => onError?.(err)
  )
}

export async function sendMessage(input: {
  bookingId: string
  senderId: string
  senderType: "family" | "vendor"
  text: string
}): Promise<void> {
  await addDoc(collection(getFirestoreDb(), "messages"), {
    bookingId: input.bookingId,
    senderId: input.senderId,
    senderType: input.senderType,
    text: input.text.trim(),
    timestamp: Date.now(),
  })
}

export function subscribeTyping(
  bookingId: string,
  onData: (state: FirestoreTypingState | null) => void
): Unsubscribe {
  return onSnapshot(doc(getFirestoreDb(), "typing", bookingId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    onData(snap.data() as FirestoreTypingState)
  })
}

let typingTimeout: ReturnType<typeof setTimeout> | null = null

export async function setTyping(
  bookingId: string,
  role: "family" | "vendor",
  isTyping: boolean
): Promise<void> {
  const field = role === "family" ? "familyTyping" : "vendorTyping"
  await setDoc(
    doc(getFirestoreDb(), "typing", bookingId),
    {
      bookingId,
      [field]: isTyping,
      updatedAt: Date.now(),
    },
    { merge: true }
  )

  if (typingTimeout) clearTimeout(typingTimeout)
  if (isTyping) {
    typingTimeout = setTimeout(() => {
      void setDoc(
        doc(getFirestoreDb(), "typing", bookingId),
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

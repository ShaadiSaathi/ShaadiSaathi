"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore"
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/config"
import { subscribeBookingsByVendor, subscribeBookingsByWedding } from "@/lib/firebase/bookings"
import type { FirestoreBooking } from "@/lib/firebase/types"
import type { ChatMessage } from "@/lib/firebase/messages"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"

interface MessagesContextValue {
  familyUnreadCount: number
  vendorUnreadCount: number
  refreshUnread: () => void
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

function countUnread(
  messages: ChatMessage[],
  bookingIds: string[],
  lastRead: Record<string, number | undefined>,
  fromSender: "family" | "vendor"
): number {
  let count = 0
  for (const msg of messages) {
    if (!bookingIds.includes(msg.bookingId)) continue
    if (msg.senderType !== fromSender) continue
    const readAt = lastRead[msg.bookingId] ?? 0
    if (msg.timestamp > readAt) count++
  }
  return count
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { isFamilyLoggedIn, isVendorLoggedIn, weddingId, vendorId } = useAuth()
  const { weddingId: ctxWeddingId } = useWedding()
  const [familyUnreadCount, setFamilyUnreadCount] = useState(0)
  const [vendorUnreadCount, setVendorUnreadCount] = useState(0)
  const [tick, setTick] = useState(0)

  const effectiveWeddingId = weddingId ?? ctxWeddingId

  useEffect(() => {
    if (!isFirebaseConfigured() || !isFamilyLoggedIn || !effectiveWeddingId) {
      setFamilyUnreadCount(0)
      return
    }

    let bookings: Array<{ id: string; lastReadByFamily?: number }> = []
    let messages: ChatMessage[] = []

    const recompute = () => {
      const lastRead = Object.fromEntries(bookings.map((b) => [b.id, b.lastReadByFamily]))
      setFamilyUnreadCount(
        countUnread(messages, bookings.map((b) => b.id), lastRead, "vendor")
      )
    }

    const unsubBookings = subscribeBookingsByWedding(effectiveWeddingId, (list) => {
      bookings = list.map((b) => ({
        id: b.id,
        lastReadByFamily: (b as { lastReadByFamily?: number }).lastReadByFamily,
      }))
      recompute()
    })

    const unsubMessages = onSnapshot(
      query(collection(getFirestoreDb(), "messages"), orderBy("timestamp", "desc")),
      (snap) => {
        messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)
        recompute()
      }
    )

    return () => {
      unsubBookings()
      unsubMessages()
    }
  }, [isFamilyLoggedIn, effectiveWeddingId, tick])

  useEffect(() => {
    if (!isFirebaseConfigured() || !isVendorLoggedIn || !vendorId) {
      setVendorUnreadCount(0)
      return
    }

    let bookings: FirestoreBooking[] = []
    let messages: ChatMessage[] = []

    const recompute = () => {
      const lastRead = Object.fromEntries(bookings.map((b) => [b.id, b.lastReadByVendor]))
      setVendorUnreadCount(
        countUnread(messages, bookings.map((b) => b.id), lastRead, "family")
      )
    }

    const unsubBookings = subscribeBookingsByVendor(vendorId, (list) => {
      bookings = list
      recompute()
    })

    const unsubMessages = onSnapshot(
      query(collection(getFirestoreDb(), "messages"), orderBy("timestamp", "desc")),
      (snap) => {
        messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)
        recompute()
      }
    )

    return () => {
      unsubBookings()
      unsubMessages()
    }
  }, [isVendorLoggedIn, vendorId, tick])

  const refreshUnread = useCallback(() => setTick((t) => t + 1), [])

  const value = useMemo(
    () => ({ familyUnreadCount, vendorUnreadCount, refreshUnread }),
    [familyUnreadCount, vendorUnreadCount, refreshUnread]
  )

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

export function useMessages() {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider")
  return ctx
}

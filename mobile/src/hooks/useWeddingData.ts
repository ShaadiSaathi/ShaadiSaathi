import { useEffect, useState } from "react"
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore"
import { getFirestoreDb } from "@/src/lib/firebase"
import type {
  AppBooking,
  AppGuest,
  AppNotification,
  AppTask,
  AppVendor,
  ChatMessage,
  EventId,
  VendorPackage,
} from "@/src/lib/types"

function asEventIds(value: unknown): EventId[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (e): e is EventId => e === "mehndi" || e === "baraat" || e === "walima"
  )
}

export function useGuests(weddingId: string | null) {
  const [guests, setGuests] = useState<AppGuest[]>([])
  const [loading, setLoading] = useState(Boolean(weddingId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!weddingId) {
      setGuests([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(getFirestoreDb(), "guests"),
      where("weddingId", "==", weddingId)
    )
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: String(data.name ?? ""),
            phone: String(data.phone ?? ""),
            events: asEventIds(data.events),
            rsvp: (data.rsvp ?? {}) as AppGuest["rsvp"],
            weddingId: String(data.weddingId ?? weddingId),
            inviteToken: String(data.inviteToken ?? d.id),
            notes: data.notes ? String(data.notes) : undefined,
          } satisfies AppGuest
        })
        rows.sort((a, b) => a.name.localeCompare(b.name))
        setGuests(rows)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [weddingId])

  return { guests, loading, error }
}

export function useTasks(weddingId: string | null) {
  const [tasks, setTasks] = useState<AppTask[]>([])
  const [loading, setLoading] = useState(Boolean(weddingId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!weddingId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(getFirestoreDb(), "tasks"),
      where("weddingId", "==", weddingId)
    )
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            title: String(data.title ?? ""),
            assignee: String(data.assignee ?? ""),
            dueDate: String(data.dueDate ?? ""),
            status: (data.status ?? "todo") as AppTask["status"],
            weddingId: String(data.weddingId ?? weddingId),
            eventId: asEventIds([data.eventId])[0],
          } satisfies AppTask
        })
        rows.sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
        setTasks(rows)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [weddingId])

  return { tasks, loading, error }
}

export function useVendors() {
  const [vendors, setVendors] = useState<AppVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onSnapshot(
      collection(getFirestoreDb(), "vendors"),
      (snap) => {
        const rows = snap.docs
          .map((d) => mapVendor(d.id, d.data()))
          .filter((v) => !v.suspended)
        rows.sort((a, b) => a.name.localeCompare(b.name))
        setVendors(rows)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [])

  return { vendors, loading, error }
}

export function useVendor(vendorId: string | null) {
  const [vendor, setVendor] = useState<AppVendor | null>(null)
  const [loading, setLoading] = useState(Boolean(vendorId))

  useEffect(() => {
    if (!vendorId) {
      setVendor(null)
      setLoading(false)
      return
    }
    return onSnapshot(doc(getFirestoreDb(), "vendors", vendorId), (snap) => {
      setVendor(snap.exists() ? mapVendor(snap.id, snap.data()) : null)
      setLoading(false)
    })
  }, [vendorId])

  return { vendor, loading }
}

function mapVendor(
  id: string,
  data: Record<string, unknown>
): AppVendor {
  const packages = Array.isArray(data.packages)
    ? (data.packages as VendorPackage[]).map((p) => ({
        name: String(p.name ?? "Package"),
        price: typeof p.price === "number" ? p.price : 0,
        description: p.description ? String(p.description) : undefined,
        perHead: Boolean(p.perHead),
      }))
    : undefined
  return {
    id,
    name: String(data.businessName ?? data.name ?? "Vendor"),
    category: data.categoryId
      ? String(data.categoryId)
      : data.category
        ? String(data.category)
        : undefined,
    categoryId: data.categoryId ? String(data.categoryId) : undefined,
    city: data.city ? String(data.city) : undefined,
    rating: typeof data.rating === "number" ? data.rating : undefined,
    reviewCount:
      typeof data.reviewCount === "number" ? data.reviewCount : undefined,
    startingPrice:
      typeof data.startingPrice === "number" ? data.startingPrice : undefined,
    bio: data.bio ? String(data.bio) : undefined,
    packages,
    verificationStatus: data.verificationStatus
      ? String(data.verificationStatus)
      : undefined,
    suspended: Boolean(data.suspended),
    availableFor: asEventIds(data.availableFor),
  }
}

function mapBooking(
  id: string,
  data: Record<string, unknown>,
  fallbackWeddingId?: string
): AppBooking {
  const counter = data.counterOffer as AppBooking["counterOffer"] | undefined
  return {
    id,
    weddingId: String(data.weddingId ?? fallbackWeddingId ?? ""),
    vendorId: String(data.vendorId ?? ""),
    vendorName: String(data.vendorName ?? "Vendor"),
    weddingName: data.weddingName ? String(data.weddingName) : undefined,
    familyName: data.familyName ? String(data.familyName) : undefined,
    eventId: data.eventId ? String(data.eventId) : undefined,
    eventDate: data.eventDate ? String(data.eventDate) : undefined,
    status: String(data.status ?? "requested"),
    price: typeof data.price === "number" ? data.price : 0,
    packageName: data.packageName ? String(data.packageName) : undefined,
    note: data.note ? String(data.note) : undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
    counterOffer: counter
      ? {
          price: typeof counter.price === "number" ? counter.price : 0,
          note: counter.note ? String(counter.note) : undefined,
          proposedBy: counter.proposedBy
            ? String(counter.proposedBy)
            : undefined,
          proposedAt:
            typeof counter.proposedAt === "number"
              ? counter.proposedAt
              : undefined,
        }
      : undefined,
  }
}

export function useBookings(weddingId: string | null) {
  const [bookings, setBookings] = useState<AppBooking[]>([])
  const [loading, setLoading] = useState(Boolean(weddingId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!weddingId) {
      setBookings([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(getFirestoreDb(), "bookings"),
      where("weddingId", "==", weddingId)
    )
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => mapBooking(d.id, d.data(), weddingId))
        rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        setBookings(rows)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [weddingId])

  return { bookings, loading, error }
}

export function useBooking(bookingId: string | null) {
  const [booking, setBooking] = useState<AppBooking | null>(null)
  const [loading, setLoading] = useState(Boolean(bookingId))

  useEffect(() => {
    if (!bookingId) {
      setBooking(null)
      setLoading(false)
      return
    }
    return onSnapshot(doc(getFirestoreDb(), "bookings", bookingId), (snap) => {
      setBooking(snap.exists() ? mapBooking(snap.id, snap.data()) : null)
      setLoading(false)
    })
  }, [bookingId])

  return { booking, loading }
}

export function useNotifications(uid: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(Boolean(uid))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(getFirestoreDb(), "notifications"),
      where("recipientUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50)
    )
    return onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              recipientUid: String(data.recipientUid ?? uid),
              message: String(data.message ?? ""),
              type: String(data.type ?? "info"),
              read: Boolean(data.read),
              createdAt:
                typeof data.createdAt === "number" ? data.createdAt : 0,
              weddingId: data.weddingId
                ? String(data.weddingId)
                : undefined,
              bookingId: data.bookingId
                ? String(data.bookingId)
                : undefined,
              taskId: data.taskId ? String(data.taskId) : undefined,
            } satisfies AppNotification
          })
        )
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [uid])

  return { notifications, loading, error }
}

export function useVendorJobs(vendorId: string | null) {
  const [jobs, setJobs] = useState<AppBooking[]>([])
  const [loading, setLoading] = useState(Boolean(vendorId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vendorId) {
      setJobs([])
      setLoading(false)
      return
    }
    const q = query(
      collection(getFirestoreDb(), "bookings"),
      where("vendorId", "==", vendorId)
    )
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => mapBooking(d.id, d.data()))
        rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        setJobs(rows)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [vendorId])

  return { jobs, loading, error }
}

export function useMessages(bookingId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(Boolean(bookingId))

  useEffect(() => {
    if (!bookingId) {
      setMessages([])
      setLoading(false)
      return
    }
    const q = query(
      collection(getFirestoreDb(), "messages"),
      where("bookingId", "==", bookingId),
      orderBy("timestamp", "asc")
    )
    return onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            bookingId: data.bookingId ? String(data.bookingId) : bookingId,
            senderId: String(data.senderId ?? ""),
            senderType: (data.senderType === "vendor" ? "vendor" : "family") as
              | "family"
              | "vendor",
            senderName: data.senderName
              ? String(data.senderName)
              : undefined,
            text: String(data.text ?? ""),
            timestamp: typeof data.timestamp === "number" ? data.timestamp : 0,
          } satisfies ChatMessage
        })
      )
      setLoading(false)
    })
  }, [bookingId])

  return { messages, loading }
}

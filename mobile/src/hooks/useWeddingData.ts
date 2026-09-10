import { useEffect, useState } from "react"
import {
  collection,
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
} from "@/src/lib/types"

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
            events: Array.isArray(data.events) ? (data.events as string[]) : [],
            rsvp: (data.rsvp ?? {}) as AppGuest["rsvp"],
            weddingId: String(data.weddingId ?? weddingId),
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
          } satisfies AppTask
        })
        rows.sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
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
          .map((d) => {
            const data = d.data()
            return {
              id: d.id,
              name: String(data.name ?? "Vendor"),
              category: data.category ? String(data.category) : undefined,
              city: data.city ? String(data.city) : undefined,
              rating: typeof data.rating === "number" ? data.rating : undefined,
              verificationStatus: data.verificationStatus
                ? String(data.verificationStatus)
                : undefined,
              suspended: Boolean(data.suspended),
            } satisfies AppVendor
          })
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
        const rows = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            weddingId: String(data.weddingId ?? weddingId),
            vendorId: String(data.vendorId ?? ""),
            vendorName: String(data.vendorName ?? "Vendor"),
            weddingName: data.weddingName
              ? String(data.weddingName)
              : undefined,
            familyName: data.familyName ? String(data.familyName) : undefined,
            eventId: data.eventId ? String(data.eventId) : undefined,
            eventDate: data.eventDate ? String(data.eventDate) : undefined,
            status: String(data.status ?? "requested"),
            price: typeof data.price === "number" ? data.price : 0,
            packageName: data.packageName
              ? String(data.packageName)
              : undefined,
            note: data.note ? String(data.note) : undefined,
            createdAt:
              typeof data.createdAt === "number" ? data.createdAt : undefined,
          } satisfies AppBooking
        })
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
        setJobs(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              weddingId: String(data.weddingId ?? ""),
              vendorId: String(data.vendorId ?? vendorId),
              vendorName: String(data.vendorName ?? "You"),
              weddingName: data.weddingName
                ? String(data.weddingName)
                : undefined,
              familyName: data.familyName ? String(data.familyName) : undefined,
              eventId: data.eventId ? String(data.eventId) : undefined,
              eventDate: data.eventDate ? String(data.eventDate) : undefined,
              status: String(data.status ?? "requested"),
              price: typeof data.price === "number" ? data.price : 0,
              packageName: data.packageName
                ? String(data.packageName)
                : undefined,
              note: data.note ? String(data.note) : undefined,
              createdAt:
                typeof data.createdAt === "number" ? data.createdAt : undefined,
            } satisfies AppBooking
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
  }, [vendorId])

  return { jobs, loading, error }
}

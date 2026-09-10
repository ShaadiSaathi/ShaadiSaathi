import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { getFirestoreDb } from "@/src/lib/firebase"
import type { AppGuest, AppTask, AppVendor } from "@/src/lib/types"

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

export function useVendorJobs(vendorId: string | null) {
  const [jobs, setJobs] = useState<
    Array<{ id: string; weddingName?: string; status?: string; price?: number }>
  >([])
  const [loading, setLoading] = useState(Boolean(vendorId))

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
    return onSnapshot(q, (snap) => {
      setJobs(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            weddingName: data.weddingName ? String(data.weddingName) : undefined,
            status: data.status ? String(data.status) : undefined,
            price: typeof data.price === "number" ? data.price : undefined,
          }
        })
      )
      setLoading(false)
    })
  }, [vendorId])

  return { jobs, loading }
}

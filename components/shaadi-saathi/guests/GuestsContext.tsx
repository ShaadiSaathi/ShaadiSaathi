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
  GUESTS as INITIAL_GUESTS,
  createGuest,
  type EventId,
  type Guest,
  type RsvpSource,
  type RsvpStatus,
} from "@/lib/mockData"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  addGuestToFirestore,
  clearGuestRsvpOrganiserAlerts,
  subscribeGuestsByWedding,
  updateGuestRsvpBulkByGuest,
  updateGuestRsvpByGuest,
  updateGuestRsvpByOrganiser,
} from "@/lib/firebase/guests"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { WeddingContext } from "@/components/shaadi-saathi/firebase/WeddingContext"

const STORAGE_KEY = "shaadi-saathi-guests"

interface GuestsContextValue {
  guests: Guest[]
  loading: boolean
  addGuest: (input: { name: string; phone?: string; events: EventId[] }) => void
  updateRsvpByOrganiser: (
    guestId: string,
    eventId: EventId,
    status: RsvpStatus
  ) => void
  updateRsvpByGuest: (
    guestId: string,
    eventId: EventId,
    status: Exclude<RsvpStatus, "cancelled" | "pending">
  ) => void
  updateRsvpBulkByGuest: (
    guestId: string,
    status: Exclude<RsvpStatus, "cancelled" | "pending">,
    eventIds: EventId[]
  ) => Promise<void>
  clearRsvpOrganiserAlerts: (guestId: string, eventIds: EventId[]) => Promise<void>
  getGuestByToken: (token: string) => Guest | undefined
}

const GuestsContext = createContext<GuestsContextValue | null>(null)

function loadGuests(): Guest[] {
  if (typeof window === "undefined") return INITIAL_GUESTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_GUESTS
    const parsed = JSON.parse(raw) as Guest[]
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_GUESTS
    return parsed.map((g) => ({
      ...g,
      rsvpSource: g.rsvpSource ?? {
        mehndi: g.events.includes("mehndi") ? "organiser" : null,
        baraat: g.events.includes("baraat") ? "organiser" : null,
        walima: g.events.includes("walima") ? "organiser" : null,
      },
      inviteToken: g.inviteToken ?? `guest-${g.id.replace("guest-", "")}`,
    }))
  } catch {
    return INITIAL_GUESTS
  }
}

function persistGuests(guests: Guest[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guests))
}

export function GuestsProvider({ children }: { children: ReactNode }) {
  const { weddingId: authWeddingId } = useAuth()
  const weddingCtx = useContext(WeddingContext)
  const ctxWeddingId = weddingCtx?.weddingId ?? null
  const firebaseMode = isFirebaseConfigured()
  // Scoped strictly to the signed-in session's wedding — never a shared/fallback id.
  const weddingId = authWeddingId ?? ctxWeddingId
  const useFirestore = firebaseMode && Boolean(weddingId)

  const [guests, setGuests] = useState<Guest[]>(firebaseMode ? [] : INITIAL_GUESTS)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(firebaseMode)

  // Local/mock mode only (Firebase not configured): hydrate from localStorage.
  useEffect(() => {
    if (firebaseMode) return
    setGuests(loadGuests())
    setHydrated(true)
    setLoading(false)
  }, [firebaseMode])

  // Firebase mode: subscribe to guests scoped to the current wedding.
  useEffect(() => {
    if (!firebaseMode) return
    if (!weddingId) {
      // Signed out or no wedding yet → empty state, never mock/sample data.
      setGuests([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeGuestsByWedding(
      weddingId,
      (list) => {
        setGuests(list)
        setLoading(false)
        setHydrated(true)
      },
      () => setLoading(false)
    )
    return unsub
  }, [firebaseMode, weddingId])

  // Persist only in local/mock mode.
  useEffect(() => {
    if (!hydrated || firebaseMode) return
    persistGuests(guests)
  }, [guests, hydrated, firebaseMode])

  const addGuest = useCallback(
    async (input: { name: string; phone?: string; events: EventId[] }) => {
      const guest = createGuest(input)
      if (useFirestore && weddingId) {
        await addGuestToFirestore(weddingId, {
          id: guest.id,
          name: guest.name,
          phone: guest.phone,
          events: guest.events,
          inviteToken: guest.inviteToken,
        })
        return
      }
      setGuests((prev) => [guest, ...prev])
    },
    [useFirestore, weddingId]
  )

  const updateRsvpByOrganiser = useCallback(
    async (guestId: string, eventId: EventId, status: RsvpStatus) => {
      const guest = guests.find((g) => g.id === guestId)
      if (useFirestore && guest) {
        await updateGuestRsvpByOrganiser(guest.inviteToken, eventId, status)
        return
      }
      const now = Date.now()
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId
            ? {
                ...g,
                rsvp: { ...g.rsvp, [eventId]: status },
                rsvpSource: { ...g.rsvpSource, [eventId]: "organiser" as RsvpSource },
                rsvpUpdatedAt: { ...g.rsvpUpdatedAt, [eventId]: now },
                rsvpOrganiserAlert: { ...g.rsvpOrganiserAlert, [eventId]: false },
              }
            : g
        )
      )
    },
    [guests, useFirestore]
  )

  const updateRsvpByGuest = useCallback(
    async (
      guestId: string,
      eventId: EventId,
      status: Exclude<RsvpStatus, "cancelled" | "pending">
    ) => {
      const guest = guests.find((g) => g.id === guestId)
      if (useFirestore && guest) {
        await updateGuestRsvpByGuest(guest.inviteToken, eventId, status)
        return
      }
      const now = Date.now()
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== guestId) return g
          const prevStatus = g.rsvp[eventId]
          const isChange =
            (prevStatus === "confirmed" || prevStatus === "declined") &&
            prevStatus !== status
          return {
            ...g,
            rsvp: { ...g.rsvp, [eventId]: status },
            rsvpSource: { ...g.rsvpSource, [eventId]: "guest" as RsvpSource },
            rsvpUpdatedAt: { ...g.rsvpUpdatedAt, [eventId]: now },
            rsvpOrganiserAlert: {
              ...g.rsvpOrganiserAlert,
              [eventId]: isChange ? true : (g.rsvpOrganiserAlert?.[eventId] ?? false),
            },
          }
        })
      )
    },
    [guests, useFirestore]
  )

  const updateRsvpBulkByGuest = useCallback(
    async (
      guestId: string,
      status: Exclude<RsvpStatus, "cancelled" | "pending">,
      eventIds: EventId[]
    ) => {
      const guest = guests.find((g) => g.id === guestId)
      if (useFirestore && guest) {
        await updateGuestRsvpBulkByGuest(guest.inviteToken, status, eventIds)
        return
      }
      for (const eventId of eventIds) {
        await updateRsvpByGuest(guestId, eventId, status)
      }
    },
    [guests, useFirestore, updateRsvpByGuest]
  )

  const clearRsvpOrganiserAlerts = useCallback(
    async (guestId: string, eventIds: EventId[]) => {
      const guest = guests.find((g) => g.id === guestId)
      if (!guest || eventIds.length === 0) return
      if (useFirestore) {
        await clearGuestRsvpOrganiserAlerts(guest.inviteToken, eventIds)
        return
      }
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== guestId) return g
          const next = { ...g.rsvpOrganiserAlert }
          for (const eventId of eventIds) next[eventId] = false
          return { ...g, rsvpOrganiserAlert: next }
        })
      )
    },
    [guests, useFirestore]
  )

  const getGuestByToken = useCallback(
    (token: string) => guests.find((g) => g.inviteToken === token),
    [guests]
  )

  const value = useMemo(
    () => ({
      guests,
      loading,
      addGuest,
      updateRsvpByOrganiser,
      updateRsvpByGuest,
      updateRsvpBulkByGuest,
      clearRsvpOrganiserAlerts,
      getGuestByToken,
    }),
    [
      guests,
      loading,
      addGuest,
      updateRsvpByOrganiser,
      updateRsvpByGuest,
      updateRsvpBulkByGuest,
      clearRsvpOrganiserAlerts,
      getGuestByToken,
    ]
  )

  return <GuestsContext.Provider value={value}>{children}</GuestsContext.Provider>
}

export function useGuests() {
  const ctx = useContext(GuestsContext)
  if (!ctx) throw new Error("useGuests must be used within GuestsProvider")
  return ctx
}

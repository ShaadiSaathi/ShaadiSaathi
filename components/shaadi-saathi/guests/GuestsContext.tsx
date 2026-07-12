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
  subscribeGuestsByWedding,
  updateGuestRsvpByGuest,
  updateGuestRsvpByOrganiser,
} from "@/lib/firebase/guests"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { WeddingContext } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { DEMO_WEDDING_ID } from "@/lib/firebase/seed"

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
  const weddingId = authWeddingId ?? ctxWeddingId ?? DEMO_WEDDING_ID
  const useFirestore = isFirebaseConfigured() && Boolean(authWeddingId ?? ctxWeddingId)

  const [guests, setGuests] = useState<Guest[]>(INITIAL_GUESTS)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(useFirestore)

  useEffect(() => {
    if (useFirestore) return
    setGuests(loadGuests())
    setHydrated(true)
  }, [useFirestore])

  useEffect(() => {
    if (!useFirestore || !weddingId) return

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
  }, [useFirestore, weddingId])

  useEffect(() => {
    if (!hydrated || useFirestore) return
    persistGuests(guests)
  }, [guests, hydrated, useFirestore])

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
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId
            ? {
                ...g,
                rsvp: { ...g.rsvp, [eventId]: status },
                rsvpSource: { ...g.rsvpSource, [eventId]: "organiser" as RsvpSource },
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
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId
            ? {
                ...g,
                rsvp: { ...g.rsvp, [eventId]: status },
                rsvpSource: { ...g.rsvpSource, [eventId]: "guest" as RsvpSource },
              }
            : g
        )
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
      getGuestByToken,
    }),
    [guests, loading, addGuest, updateRsvpByOrganiser, updateRsvpByGuest, getGuestByToken]
  )

  return <GuestsContext.Provider value={value}>{children}</GuestsContext.Provider>
}

export function useGuests() {
  const ctx = useContext(GuestsContext)
  if (!ctx) throw new Error("useGuests must be used within GuestsProvider")
  return ctx
}

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
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import {
  EVENTS,
  type EventId,
  type EventMoodPhoto,
  type EventTimelineEntry,
} from "@/lib/mockData"

interface EventDetailOverrides {
  organiserNotes?: string
  daySchedule?: EventTimelineEntry[]
  moodPhotos?: EventMoodPhoto[]
}

type EventDetailStore = Partial<Record<EventId, EventDetailOverrides>>

interface EventDetailContextValue {
  getNotes: (eventId: EventId) => string
  setNotes: (eventId: EventId, notes: string) => void
  getTimeline: (eventId: EventId) => EventTimelineEntry[]
  addTimelineEntry: (eventId: EventId, entry: Omit<EventTimelineEntry, "id">) => void
  updateTimelineEntry: (
    eventId: EventId,
    entryId: string,
    updates: Partial<Omit<EventTimelineEntry, "id">>
  ) => void
  removeTimelineEntry: (eventId: EventId, entryId: string) => void
  moveTimelineEntry: (eventId: EventId, entryId: string, direction: "up" | "down") => void
  getMoodPhotos: (eventId: EventId) => EventMoodPhoto[]
  addMoodPhoto: (eventId: EventId, photo: EventMoodPhoto) => void
  removeMoodPhoto: (eventId: EventId, photoId: string) => void
}

const EventDetailContext = createContext<EventDetailContextValue | null>(null)

function storageKey(weddingId: string | null, isFirebaseMode: boolean): string {
  if (isFirebaseMode && weddingId) {
    return `shaadi-saathi-event-details:${weddingId}`
  }
  // Mock / tester mode only — never share with real Firebase weddings
  return "shaadi-saathi-event-details:mock"
}

function loadStore(key: string): EventDetailStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as EventDetailStore) : {}
  } catch {
    return {}
  }
}

function persistStore(key: string, store: EventDetailStore) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(store))
}

function getDefaultEvent(eventId: EventId) {
  return EVENTS.find((e) => e.id === eventId)!
}

export function EventDetailProvider({ children }: { children: ReactNode }) {
  const { isFirebaseMode } = useAuth()
  const { weddingId } = useWedding()
  const key = storageKey(weddingId, isFirebaseMode)

  const [store, setStore] = useState<EventDetailStore>({})
  const [hydrated, setHydrated] = useState(false)

  // Real accounts start blank; mock/demo keeps sample content.
  const useDemoDefaults = !isFirebaseMode

  useEffect(() => {
    setStore(loadStore(key))
    setHydrated(true)
  }, [key])

  useEffect(() => {
    if (hydrated) persistStore(key, store)
  }, [store, hydrated, key])

  const patchEvent = useCallback(
    (eventId: EventId, patch: EventDetailOverrides) => {
      setStore((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], ...patch },
      }))
    },
    []
  )

  const defaultNotes = useCallback(
    (eventId: EventId) =>
      useDemoDefaults ? getDefaultEvent(eventId).organiserNotes : "",
    [useDemoDefaults]
  )

  const defaultTimeline = useCallback(
    (eventId: EventId) =>
      useDemoDefaults ? getDefaultEvent(eventId).daySchedule : [],
    [useDemoDefaults]
  )

  const defaultMoodPhotos = useCallback(
    (eventId: EventId) =>
      useDemoDefaults ? getDefaultEvent(eventId).moodPhotos : [],
    [useDemoDefaults]
  )

  const getNotes = useCallback(
    (eventId: EventId) => store[eventId]?.organiserNotes ?? defaultNotes(eventId),
    [store, defaultNotes]
  )

  const setNotes = useCallback(
    (eventId: EventId, notes: string) => {
      patchEvent(eventId, { organiserNotes: notes })
    },
    [patchEvent]
  )

  const getTimeline = useCallback(
    (eventId: EventId) => store[eventId]?.daySchedule ?? defaultTimeline(eventId),
    [store, defaultTimeline]
  )

  const addTimelineEntry = useCallback(
    (eventId: EventId, entry: Omit<EventTimelineEntry, "id">) => {
      const current = store[eventId]?.daySchedule ?? defaultTimeline(eventId)
      patchEvent(eventId, {
        daySchedule: [...current, { ...entry, id: `tl-${Date.now()}` }],
      })
    },
    [store, patchEvent, defaultTimeline]
  )

  const updateTimelineEntry = useCallback(
    (
      eventId: EventId,
      entryId: string,
      updates: Partial<Omit<EventTimelineEntry, "id">>
    ) => {
      const current = store[eventId]?.daySchedule ?? defaultTimeline(eventId)
      patchEvent(eventId, {
        daySchedule: current.map((e) =>
          e.id === entryId ? { ...e, ...updates } : e
        ),
      })
    },
    [store, patchEvent, defaultTimeline]
  )

  const removeTimelineEntry = useCallback(
    (eventId: EventId, entryId: string) => {
      const current = store[eventId]?.daySchedule ?? defaultTimeline(eventId)
      patchEvent(eventId, {
        daySchedule: current.filter((e) => e.id !== entryId),
      })
    },
    [store, patchEvent, defaultTimeline]
  )

  const moveTimelineEntry = useCallback(
    (eventId: EventId, entryId: string, direction: "up" | "down") => {
      const current = [...(store[eventId]?.daySchedule ?? defaultTimeline(eventId))]
      const idx = current.findIndex((e) => e.id === entryId)
      if (idx < 0) return
      const swapIdx = direction === "up" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= current.length) return
      ;[current[idx], current[swapIdx]] = [current[swapIdx]!, current[idx]!]
      patchEvent(eventId, { daySchedule: current })
    },
    [store, patchEvent, defaultTimeline]
  )

  const getMoodPhotos = useCallback(
    (eventId: EventId) => store[eventId]?.moodPhotos ?? defaultMoodPhotos(eventId),
    [store, defaultMoodPhotos]
  )

  const addMoodPhoto = useCallback(
    (eventId: EventId, photo: EventMoodPhoto) => {
      const current = store[eventId]?.moodPhotos ?? defaultMoodPhotos(eventId)
      patchEvent(eventId, { moodPhotos: [...current, photo] })
    },
    [store, patchEvent, defaultMoodPhotos]
  )

  const removeMoodPhoto = useCallback(
    (eventId: EventId, photoId: string) => {
      const current = store[eventId]?.moodPhotos ?? defaultMoodPhotos(eventId)
      patchEvent(eventId, {
        moodPhotos: current.filter((p) => p.id !== photoId),
      })
    },
    [store, patchEvent, defaultMoodPhotos]
  )

  const value = useMemo(
    () => ({
      getNotes,
      setNotes,
      getTimeline,
      addTimelineEntry,
      updateTimelineEntry,
      removeTimelineEntry,
      moveTimelineEntry,
      getMoodPhotos,
      addMoodPhoto,
      removeMoodPhoto,
    }),
    [
      getNotes,
      setNotes,
      getTimeline,
      addTimelineEntry,
      updateTimelineEntry,
      removeTimelineEntry,
      moveTimelineEntry,
      getMoodPhotos,
      addMoodPhoto,
      removeMoodPhoto,
    ]
  )

  return (
    <EventDetailContext.Provider value={value}>{children}</EventDetailContext.Provider>
  )
}

export function useEventDetail() {
  const ctx = useContext(EventDetailContext)
  if (!ctx) throw new Error("useEventDetail must be used within EventDetailProvider")
  return ctx
}

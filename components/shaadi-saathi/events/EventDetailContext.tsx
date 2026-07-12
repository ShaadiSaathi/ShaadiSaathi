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

const STORAGE_KEY = "shaadi-saathi-event-details"

const EventDetailContext = createContext<EventDetailContextValue | null>(null)

function loadStore(): EventDetailStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EventDetailStore) : {}
  } catch {
    return {}
  }
}

function persistStore(store: EventDetailStore) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function getDefaultEvent(eventId: EventId) {
  return EVENTS.find((e) => e.id === eventId)!
}

export function EventDetailProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<EventDetailStore>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setStore(loadStore())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) persistStore(store)
  }, [store, hydrated])

  const patchEvent = useCallback(
    (eventId: EventId, patch: EventDetailOverrides) => {
      setStore((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], ...patch },
      }))
    },
    []
  )

  const getNotes = useCallback(
    (eventId: EventId) =>
      store[eventId]?.organiserNotes ?? getDefaultEvent(eventId).organiserNotes,
    [store]
  )

  const setNotes = useCallback(
    (eventId: EventId, notes: string) => {
      patchEvent(eventId, { organiserNotes: notes })
    },
    [patchEvent]
  )

  const getTimeline = useCallback(
    (eventId: EventId) =>
      store[eventId]?.daySchedule ?? getDefaultEvent(eventId).daySchedule,
    [store]
  )

  const addTimelineEntry = useCallback(
    (eventId: EventId, entry: Omit<EventTimelineEntry, "id">) => {
      const current = store[eventId]?.daySchedule ?? getDefaultEvent(eventId).daySchedule
      patchEvent(eventId, {
        daySchedule: [...current, { ...entry, id: `tl-${Date.now()}` }],
      })
    },
    [store, patchEvent]
  )

  const updateTimelineEntry = useCallback(
    (
      eventId: EventId,
      entryId: string,
      updates: Partial<Omit<EventTimelineEntry, "id">>
    ) => {
      const current = store[eventId]?.daySchedule ?? getDefaultEvent(eventId).daySchedule
      patchEvent(eventId, {
        daySchedule: current.map((e) =>
          e.id === entryId ? { ...e, ...updates } : e
        ),
      })
    },
    [store, patchEvent]
  )

  const removeTimelineEntry = useCallback(
    (eventId: EventId, entryId: string) => {
      const current = store[eventId]?.daySchedule ?? getDefaultEvent(eventId).daySchedule
      patchEvent(eventId, {
        daySchedule: current.filter((e) => e.id !== entryId),
      })
    },
    [store, patchEvent]
  )

  const moveTimelineEntry = useCallback(
    (eventId: EventId, entryId: string, direction: "up" | "down") => {
      const current = [...(store[eventId]?.daySchedule ?? getDefaultEvent(eventId).daySchedule)]
      const idx = current.findIndex((e) => e.id === entryId)
      if (idx < 0) return
      const swapIdx = direction === "up" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= current.length) return
      ;[current[idx], current[swapIdx]] = [current[swapIdx]!, current[idx]!]
      patchEvent(eventId, { daySchedule: current })
    },
    [store, patchEvent]
  )

  const getMoodPhotos = useCallback(
    (eventId: EventId) =>
      store[eventId]?.moodPhotos ?? getDefaultEvent(eventId).moodPhotos,
    [store]
  )

  const addMoodPhoto = useCallback(
    (eventId: EventId, photo: EventMoodPhoto) => {
      const current = store[eventId]?.moodPhotos ?? getDefaultEvent(eventId).moodPhotos
      patchEvent(eventId, { moodPhotos: [...current, photo] })
    },
    [store, patchEvent]
  )

  const removeMoodPhoto = useCallback(
    (eventId: EventId, photoId: string) => {
      const current = store[eventId]?.moodPhotos ?? getDefaultEvent(eventId).moodPhotos
      patchEvent(eventId, {
        moodPhotos: current.filter((p) => p.id !== photoId),
      })
    },
    [store, patchEvent]
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

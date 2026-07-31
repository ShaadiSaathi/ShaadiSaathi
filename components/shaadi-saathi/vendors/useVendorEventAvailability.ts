"use client"

import { useEffect, useMemo, useState } from "react"
import type { EventId } from "@/lib/mockData"
import { EVENTS } from "@/lib/mockData"
import { resolveWeddingEvent } from "@/lib/events/rsvp-lock"
import type { Vendor } from "@/lib/mockVendors"
import {
  checkVendorDateAvailability,
  formatAvailableDateLabel,
  formatPendingElsewhereLabel,
  formatUnavailableDateLabel,
  type ResolvedEventAvailability,
} from "@/lib/firebase/vendor-availability"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import type { WeddingEventOverrides } from "@/lib/events/rsvp-lock"

function buildServiceOnlyAvailability(vendor: Vendor): ResolvedEventAvailability[] {
  return EVENTS.map((event) => {
    const serviceOk = vendor.availableFor.includes(event.id)
    return {
      available: serviceOk,
      kind: serviceOk ? "open" : "service_unavailable",
      eventId: event.id,
      eventDate: event.date,
      eventName: event.name,
      label: serviceOk
        ? formatAvailableDateLabel(event.name, event.date)
        : `Not available for ${event.name}`,
    }
  })
}

/**
 * Combines vendor service-type availability with platform-wide confirmed
 * date locks (other families' bookings).
 */
export function useVendorEventAvailability(vendor: Vendor | null | undefined): {
  rows: ResolvedEventAvailability[]
  loading: boolean
} {
  const { isFirebaseMode } = useAuth()
  const { wedding, weddingId } = useWedding()
  const overrides = (wedding?.eventOverrides ?? {}) as WeddingEventOverrides
  const [rows, setRows] = useState<ResolvedEventAvailability[]>(() =>
    vendor ? buildServiceOnlyAvailability(vendor) : []
  )
  const [loading, setLoading] = useState(false)

  const vendorKey = vendor?.id ?? ""
  const availableForKey = vendor?.availableFor?.join(",") ?? ""

  const eventDates = useMemo(() => {
    return EVENTS.map((e) => {
      const resolved = resolveWeddingEvent(e.id, overrides)
      return {
        eventId: e.id as EventId,
        eventName: resolved?.name ?? e.name,
        eventDate: resolved?.date ?? e.date,
      }
    })
  }, [overrides])

  useEffect(() => {
    if (!vendor) {
      setRows([])
      return
    }

    if (!isFirebaseMode) {
      setRows(buildServiceOnlyAvailability(vendor))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      const next: ResolvedEventAvailability[] = []
      for (const ev of eventDates) {
        const serviceOk = vendor.availableFor.includes(ev.eventId)
        if (!serviceOk) {
          next.push({
            available: false,
            kind: "service_unavailable",
            eventId: ev.eventId,
            eventDate: ev.eventDate,
            eventName: ev.eventName,
            label: `Not available for ${ev.eventName}`,
          })
          continue
        }

        try {
          const result = await checkVendorDateAvailability({
            vendorId: vendor.id,
            eventDate: ev.eventDate,
            weddingId,
          })
          if (result.state === "blocked") {
            next.push({
              available: false,
              kind: result.isOwnWedding ? "date_blocked_own" : "date_blocked",
              eventId: ev.eventId,
              eventDate: ev.eventDate,
              eventName: ev.eventName,
              label: result.isOwnWedding
                ? `Already booked for your ${ev.eventName} (${new Date(`${ev.eventDate}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short" })})`
                : formatUnavailableDateLabel(ev.eventName, ev.eventDate),
            })
          } else if (result.state === "pending_elsewhere") {
            next.push({
              available: true,
              kind: "pending_elsewhere",
              eventId: ev.eventId,
              eventDate: ev.eventDate,
              eventName: ev.eventName,
              label: formatPendingElsewhereLabel(ev.eventName, ev.eventDate),
            })
          } else {
            next.push({
              available: true,
              kind: "open",
              eventId: ev.eventId,
              eventDate: ev.eventDate,
              eventName: ev.eventName,
              label: formatAvailableDateLabel(ev.eventName, ev.eventDate),
            })
          }
        } catch {
          // Fail open on read errors for service-available events so a lock
          // read blip does not hide bookable dates; create API still enforces.
          next.push({
            available: true,
            kind: "open",
            eventId: ev.eventId,
            eventDate: ev.eventDate,
            eventName: ev.eventName,
            label: formatAvailableDateLabel(ev.eventName, ev.eventDate),
          })
        }
      }
      if (!cancelled) {
        setRows(next)
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [vendor, vendorKey, availableForKey, isFirebaseMode, weddingId, eventDates])

  return { rows, loading }
}

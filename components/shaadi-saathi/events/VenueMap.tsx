"use client"

import dynamic from "next/dynamic"
import type { WeddingEvent } from "@/lib/mockData"

const VenueMapInner = dynamic(() => import("./VenueMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center rounded-xl border border-gold/15 bg-maroon/5 sm:h-64">
      <p className="text-sm text-maroon/50">Loading map…</p>
    </div>
  ),
})

interface VenueMapProps {
  event: WeddingEvent
  confirmedGuestCount: number
}

/** Leaflet map wrapper — client-only to avoid SSR issues */
export default function VenueMap(props: VenueMapProps) {
  return <VenueMapInner {...props} />
}

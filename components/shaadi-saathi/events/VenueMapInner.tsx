"use client"

import { MapContainer, Marker, TileLayer } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { WeddingEvent } from "@/lib/mockData"
import { getGoogleMapsDirectionsUrl } from "@/lib/mockData"

/** Custom maroon/gold map pin */
const venueIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #6A1B4D 0%, #881337 100%);
    border: 2px solid #B8860B;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(106,27,77,0.35);
  " aria-hidden="true"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

interface VenueMapProps {
  event: WeddingEvent
  confirmedGuestCount: number
}

export default function VenueMapInner({ event, confirmedGuestCount }: VenueMapProps) {
  const directionsUrl = getGoogleMapsDirectionsUrl(event.latitude, event.longitude)
  const capacityPct =
    event.capacity > 0
      ? Math.round((confirmedGuestCount / event.capacity) * 100)
      : 0
  const nearCapacity = capacityPct >= 85

  return (
    <section
      aria-labelledby="venue-heading"
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
    >
      <h2 id="venue-heading" className="font-display text-lg font-semibold text-maroon-dark">
        Venue
      </h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-gold/15 shadow-inner">
        <MapContainer
          center={[event.latitude, event.longitude]}
          zoom={15}
          scrollWheelZoom={false}
          className="h-56 w-full sm:h-64 [&_.leaflet-control-attribution]:text-[10px]"
          aria-label={`Map showing ${event.venue}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[event.latitude, event.longitude]} icon={venueIcon} />
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-maroon-dark">{event.venue}</p>
          <p className="mt-0.5 text-sm text-maroon/60">{event.address}</p>

          <p
            className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              nearCapacity
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            Venue capacity: {event.capacity.toLocaleString()} · Confirmed guests:{" "}
            {confirmedGuestCount.toLocaleString()}
            {nearCapacity && " · Getting close to capacity"}
          </p>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-2.5 text-sm font-semibold text-maroon-dark shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.789c-.38.19-.622.58-.622 1.006v4.286c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.125 1.125 0 011.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          Get Directions
        </a>
      </div>
    </section>
  )
}

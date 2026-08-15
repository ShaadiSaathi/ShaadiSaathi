"use client"

import { useMemo, useState } from "react"
import type { EventId } from "@/lib/mockData"
import { EVENTS } from "@/lib/mockData"

export type PastWorkPhoto = {
  id: string
  url: string
  caption?: string
  eventId?: EventId
}

type VendorPastWorkGalleryProps = {
  vendorName: string
  photos: PastWorkPhoto[]
  /** Fallback CSS gradients when no real photos (legacy listings) */
  fallbackGradients?: string[]
}

/** Family-facing past-work gallery with event filter + lightbox. */
export default function VendorPastWorkGallery({
  vendorName,
  photos,
  fallbackGradients = [],
}: VendorPastWorkGalleryProps) {
  const [filter, setFilter] = useState<EventId | "all">("all")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (filter === "all") return photos
    return photos.filter((p) => !p.eventId || p.eventId === filter)
  }, [photos, filter])

  const hasRealPhotos = photos.length > 0
  const showFilter =
    hasRealPhotos &&
    photos.some((p) => p.eventId) &&
    EVENTS.some((e) => photos.some((p) => p.eventId === e.id))

  if (!hasRealPhotos) {
    return (
      <section aria-label="Past work" className="mb-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-maroon-dark">
          Past work
        </h2>
        {fallbackGradients.length > 0 ? (
          <div className="overflow-hidden rounded-[1.25rem]">
            <div
              className={`h-56 bg-gradient-to-br ${fallbackGradients[0]} sm:h-72`}
              role="img"
              aria-label={`${vendorName} placeholder`}
            />
          </div>
        ) : null}
        <div className="mt-4 rounded-2xl border border-dashed border-gold/30 bg-white/60 px-5 py-8 text-center">
          <p className="font-medium text-maroon-dark">No photos yet</p>
          <p className="mt-1 text-sm text-maroon/55">
            This vendor hasn’t added past-work photos. Message them to ask for
            recent examples.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Past work" className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-maroon-dark">
          Past work
        </h2>
        {showFilter ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by event">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              onClick={() => setFilter("all")}
              className={`min-h-[40px] rounded-full px-3 text-xs font-semibold ${
                filter === "all"
                  ? "bg-maroon text-ivory"
                  : "bg-white text-maroon/70 ring-1 ring-gold/25"
              }`}
            >
              All
            </button>
            {EVENTS.map((ev) => (
              <button
                key={ev.id}
                type="button"
                role="tab"
                aria-selected={filter === ev.id}
                onClick={() => setFilter(ev.id)}
                className={`min-h-[40px] rounded-full px-3 text-xs font-semibold ${
                  filter === ev.id
                    ? "bg-maroon text-ivory"
                    : "bg-white text-maroon/70 ring-1 ring-gold/25"
                }`}
              >
                {ev.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 bg-white/60 px-5 py-8 text-center">
          <p className="text-sm text-maroon/60">
            No photos tagged for this event yet. Try “All”.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
          {filtered.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="group block w-full overflow-hidden rounded-2xl bg-ivory text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `${vendorName} past work ${i + 1}`}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {photo.caption ? (
                  <p className="truncate px-3 py-2 text-xs text-maroon/65">
                    {photo.caption}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightboxIndex !== null && filtered[lightboxIndex] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Past work photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-maroon-dark/85 p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxIndex(null)
          }}
        >
          <button
            type="button"
            className="absolute right-4 top-4 min-h-[44px] rounded-full bg-white/95 px-4 text-sm font-semibold text-maroon"
            onClick={() => setLightboxIndex(null)}
          >
            Close
          </button>
          {filtered.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 min-h-[44px] -translate-y-1/2 rounded-full bg-white/95 px-3 text-sm font-semibold text-maroon"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex(
                    (lightboxIndex - 1 + filtered.length) % filtered.length
                  )
                }}
              >
                Prev
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 min-h-[44px] -translate-y-1/2 rounded-full bg-white/95 px-3 text-sm font-semibold text-maroon"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex((lightboxIndex + 1) % filtered.length)
                }}
              >
                Next
              </button>
            </>
          ) : null}
          <figure
            className="max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filtered[lightboxIndex]!.url}
              alt={
                filtered[lightboxIndex]!.caption ||
                `${vendorName} past work`
              }
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
            {filtered[lightboxIndex]!.caption ? (
              <figcaption className="mt-3 text-center text-sm text-ivory/90">
                {filtered[lightboxIndex]!.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </section>
  )
}

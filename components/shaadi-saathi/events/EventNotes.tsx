"use client"

import { useRef } from "react"
import { useEventDetail } from "@/components/shaadi-saathi/events/EventDetailContext"
import type { EventId } from "@/lib/mockData"

interface EventNotesProps {
  eventId: EventId
}

export default function EventNotes({ eventId }: EventNotesProps) {
  const { getNotes, setNotes, getMoodPhotos, addMoodPhoto, removeMoodPhoto } =
    useEventDetail()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const notes = getNotes(eventId)
  const photos = getMoodPhotos(eventId)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      addMoodPhoto(eventId, {
        id: `photo-${Date.now()}`,
        name: file.name,
        previewUrl: reader.result as string,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <section
      aria-labelledby="event-notes-heading"
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
    >
      <h2 id="event-notes-heading" className="font-display text-lg font-semibold text-maroon-dark">
        Notes & Mood Board
      </h2>

      <div className="mt-4">
        <label htmlFor={`event-notes-${eventId}`} className="block text-sm font-medium text-maroon/70">
          Organiser notes
        </label>
        <p className="text-xs text-maroon/40">
          Dress code, theme colors, vendor instructions — anything the team should know.
        </p>
        <textarea
          id={`event-notes-${eventId}`}
          value={notes}
          onChange={(e) => setNotes(eventId, e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-gold/20 bg-ivory/30 px-4 py-3 text-sm text-maroon-dark placeholder:text-maroon/30 focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
          placeholder="Add notes for this event…"
        />
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-maroon/70">Mood board</h3>
            <p className="text-xs text-maroon/40">Decor inspiration, outfit colors, reference images</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs font-medium text-maroon/70 transition-colors hover:border-gold/40 hover:bg-gold/5"
          >
            Upload image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload mood board image"
          />
        </div>

        {photos.length === 0 ? (
          <p className="mt-3 text-sm text-maroon/40">No reference images yet.</p>
        ) : (
          <ul
            className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"
            role="list"
            aria-label="Mood board images"
          >
            {photos.map((photo) => (
              <li key={photo.id} className="group relative overflow-hidden rounded-xl border border-gold/15">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={
                    photo.previewUrl.startsWith("linear-gradient")
                      ? { background: photo.previewUrl }
                      : { backgroundImage: `url(${photo.previewUrl})` }
                  }
                  role="img"
                  aria-label={photo.name}
                />
                <div className="flex items-center justify-between gap-1 bg-white px-2 py-1.5">
                  <p className="truncate text-xs text-maroon/60">{photo.name}</p>
                  <button
                    type="button"
                    onClick={() => removeMoodPhoto(eventId, photo.id)}
                    className="shrink-0 text-xs text-rose-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-600"
                    aria-label={`Remove ${photo.name}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { getFirebaseAuth } from "@/lib/firebase/config"
import {
  createPortfolioItem,
  VENDOR_PORTFOLIO_CAPTION_MAX,
  VENDOR_PORTFOLIO_MAX_IMAGES,
  type VendorPortfolioEventId,
  type VendorPortfolioItem,
} from "@/lib/firebase/vendor-portfolio"
import {
  uploadVendorPortfolioImage,
  VENDOR_IMAGE_ACCEPT,
} from "@/lib/firebase/vendor-upload"
import { EVENTS } from "@/lib/mockData"

const EVENT_OPTIONS: Array<{ id: VendorPortfolioEventId | ""; label: string }> =
  [
    { id: "", label: "Any event" },
    ...EVENTS.map((e) => ({
      id: e.id as VendorPortfolioEventId,
      label: e.name,
    })),
  ]

async function savePortfolioViaApi(
  vendorId: string,
  items: VendorPortfolioItem[]
): Promise<VendorPortfolioItem[]> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to save your portfolio")
  const token = await user.getIdToken()
  const res = await fetch("/api/vendor/portfolio", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vendorId, items }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    items?: VendorPortfolioItem[]
  }
  if (!res.ok) {
    throw new Error(data.message ?? "Could not save portfolio")
  }
  return data.items ?? items
}

type VendorPortfolioManagerProps = {
  initialItems: VendorPortfolioItem[]
  onSaved?: (items: VendorPortfolioItem[]) => void
}

/** Vendor Profile — manage past-work photos (upload, reorder, caption, tag, delete). */
export default function VendorPortfolioManager({
  initialItems,
  onSaved,
}: VendorPortfolioManagerProps) {
  const { vendorId, firebaseUser, isFirebaseMode } = useAuth()
  const [items, setItems] = useState<VendorPortfolioItem[]>(initialItems)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setItems(initialItems)
    setDirty(false)
  }, [initialItems])

  function markDirty(next: VendorPortfolioItem[]) {
    setItems(next)
    setDirty(true)
    setSuccess(null)
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    if (!isFirebaseMode || !vendorId || !firebaseUser) {
      setError("Sign in with Firebase to upload portfolio photos")
      return
    }
    const remaining = VENDOR_PORTFOLIO_MAX_IMAGES - items.length
    if (remaining <= 0) {
      setError(`Maximum ${VENDOR_PORTFOLIO_MAX_IMAGES} photos`)
      return
    }

    setUploading(true)
    setError(null)
    try {
      const selected = Array.from(files).slice(0, remaining)
      const added: VendorPortfolioItem[] = []
      for (const file of selected) {
        const url = await uploadVendorPortfolioImage({
          vendorId,
          uid: firebaseUser.uid,
          file,
        })
        added.push(createPortfolioItem(url))
      }
      const next = [...items, ...added]
      markDirty(next)
      const saved = await savePortfolioViaApi(vendorId, next)
      setItems(saved)
      setDirty(false)
      setSuccess(`Added ${added.length} photo${added.length === 1 ? "" : "s"}`)
      onSaved?.(saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSave() {
    if (!vendorId || !isFirebaseMode) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await savePortfolioViaApi(vendorId, items)
      setItems(saved)
      setDirty(false)
      setSuccess("Past work saved")
      onSaved?.(saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  function moveItem(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const tmp = next[index]!
    next[index] = next[target]!
    next[target] = tmp
    markDirty(next)
  }

  function removeItem(id: string) {
    markDirty(items.filter((i) => i.id !== id))
  }

  function updateItem(
    id: string,
    patch: Partial<Pick<VendorPortfolioItem, "caption" | "eventId">>
  ) {
    markDirty(
      items.map((i) => {
        if (i.id !== id) return i
        const next = { ...i }
        if ("caption" in patch) {
          const c = patch.caption?.trim() ?? ""
          if (c) next.caption = c.slice(0, VENDOR_PORTFOLIO_CAPTION_MAX)
          else delete next.caption
        }
        if ("eventId" in patch) {
          if (patch.eventId) next.eventId = patch.eventId
          else delete next.eventId
        }
        return next
      })
    )
  }

  return (
    <section
      aria-labelledby="past-work-heading"
      className="rounded-2xl border border-gold/25 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="past-work-heading"
            className="font-display text-lg font-semibold text-maroon-dark"
          >
            Past work
          </h3>
          <p className="mt-1 text-sm text-maroon/60">
            Photos families see on your public listing. Up to{" "}
            {VENDOR_PORTFOLIO_MAX_IMAGES} images (5MB each). Optional captions
            and event tags help families filter.
          </p>
        </div>
        <p className="text-xs font-medium text-maroon/45">
          {items.length}/{VENDOR_PORTFOLIO_MAX_IMAGES}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={uploading || items.length >= VENDOR_PORTFOLIO_MAX_IMAGES}
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-maroon px-4 text-sm font-semibold text-ivory disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={VENDOR_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => void handleUpload(e.target.files)}
        />
        {dirty ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-gold/40 px-4 text-sm font-semibold text-maroon disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm text-emerald-800">{success}</p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gold/30 bg-ivory/50 px-4 py-10 text-center">
          <p className="text-sm text-maroon/60">No photos yet</p>
          <p className="mt-1 text-xs text-maroon/45">
            Add past work so families can see your style on your public page.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-ivory/40 p-3 sm:flex-row"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption || `Past work ${index + 1}`}
                className="aspect-square w-full max-w-[140px] shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-maroon/45">
                  Caption
                  <input
                    type="text"
                    maxLength={VENDOR_PORTFOLIO_CAPTION_MAX}
                    value={item.caption ?? ""}
                    onChange={(e) =>
                      updateItem(item.id, { caption: e.target.value })
                    }
                    placeholder="Optional short caption"
                    className="mt-1 w-full rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm text-maroon-dark"
                  />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wide text-maroon/45">
                  Event type
                  <select
                    value={item.eventId ?? ""}
                    onChange={(e) =>
                      updateItem(item.id, {
                        eventId: (e.target.value || undefined) as
                          | VendorPortfolioEventId
                          | undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm text-maroon-dark"
                  >
                    {EVENT_OPTIONS.map((opt) => (
                      <option key={opt.id || "all"} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="min-h-[40px] rounded-lg border border-gold/30 px-3 text-xs font-semibold text-maroon disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="min-h-[40px] rounded-lg border border-gold/30 px-3 text-xs font-semibold text-maroon disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="min-h-[40px] rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

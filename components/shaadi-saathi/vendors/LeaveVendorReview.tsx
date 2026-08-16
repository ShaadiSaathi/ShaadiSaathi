"use client"

import { useEffect, useMemo, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { getVendorReview, isBookingReviewEligible } from "@/lib/firebase/vendor-reviews"
import { upsertVendorReviewApi } from "@/lib/firebase/reviews-client"
import type { FirestoreVendorReview } from "@/lib/firebase/types"
import type { BookingStatus } from "@/lib/mockVendors"
import { EVENTS } from "@/lib/mockData"

function StarButton({
  value,
  filled,
  onSelect,
  disabled,
}: {
  value: number
  filled: boolean
  onSelect: (n: number) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${value} star${value === 1 ? "" : "s"}`}
      onClick={() => onSelect(value)}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        filled ? "text-gold" : "text-maroon/25 hover:text-gold/70"
      } disabled:opacity-50`}
    >
      <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  )
}

export function StarRow({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
  return (
    <span className="inline-flex items-center gap-0.5 text-gold" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={cls}
          fill={n <= Math.round(rating) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

type LeaveReviewProps = {
  bookingId: string
  vendorName: string
  status: BookingStatus
  eventId: string
  eventDate?: string
}

/** Family leave / edit review after event date or completed status. */
export default function LeaveVendorReview({
  bookingId,
  vendorName,
  status,
  eventId,
  eventDate,
}: LeaveReviewProps) {
  const { isFirebaseMode } = useAuth()
  const eligible = useMemo(
    () => isBookingReviewEligible({ status, eventDate }),
    [status, eventDate]
  )
  const [existing, setExisting] = useState<FirestoreVendorReview | null>(null)
  const [loading, setLoading] = useState(isFirebaseMode && eligible)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  const eventLabel = EVENTS.find((e) => e.id === eventId)?.name ?? eventId

  useEffect(() => {
    if (!isFirebaseMode || !eligible) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void getVendorReview(bookingId)
      .then((review) => {
        if (cancelled) return
        setExisting(review)
        if (review) {
          setRating(review.rating)
          setComment(review.comment ?? "")
        }
      })
      .catch(() => {
        if (!cancelled) setExisting(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isFirebaseMode, eligible, bookingId])

  if (!isFirebaseMode || !eligible) return null
  if (loading) {
    return (
      <p className="mt-3 text-xs text-maroon/50" role="status">
        Checking review…
      </p>
    )
  }

  if (existing && !editing) {
    return (
      <div className="mt-4 rounded-xl border border-gold/20 bg-ivory/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-maroon/50">
          Your review
        </p>
        <div className="mt-1 flex items-center gap-2">
          <StarRow rating={existing.rating} />
          <span className="text-xs text-maroon/50">{eventLabel}</span>
        </div>
        {existing.comment ? (
          <p className="mt-2 text-sm leading-relaxed text-maroon/75">
            &ldquo;{existing.comment}&rdquo;
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setEditing(true)
            setSaved(false)
            setError(null)
          }}
          className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-maroon hover:text-gold-dark"
        >
          Edit review
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-gold/25 bg-white px-4 py-4">
      <p className="font-display text-sm font-semibold text-maroon-dark">
        {existing ? "Update your review" : `How was ${vendorName}?`}
      </p>
      <p className="mt-1 text-xs text-maroon/55">
        Rate this booking after the event — your review helps other families.
      </p>
      <div className="mt-3 flex items-center gap-1" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarButton
            key={n}
            value={n}
            filled={n <= rating}
            disabled={busy}
            onSelect={setRating}
          />
        ))}
      </div>
      <label htmlFor={`review-comment-${bookingId}`} className="mt-3 block text-xs font-medium text-maroon/60">
        Comment (optional)
      </label>
      <textarea
        id={`review-comment-${bookingId}`}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 1000))}
        rows={3}
        disabled={busy}
        placeholder="What went well? Anything other families should know?"
        className="mt-1 w-full rounded-xl border border-gold/25 bg-ivory/40 px-3 py-2 text-sm text-maroon-dark placeholder:text-maroon/35 focus:border-maroon/40 focus:outline-none focus:ring-2 focus:ring-maroon/15"
      />
      {error ? (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          Review saved — thank you.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <GoldButton
          type="button"
          disabled={busy || rating < 1}
          className="min-h-[44px] text-xs"
          onClick={() => {
            setBusy(true)
            setError(null)
            setSaved(false)
            void upsertVendorReviewApi({
              bookingId,
              rating,
              comment: comment.trim() || undefined,
            })
              .then((review) => {
                setExisting(review)
                setEditing(false)
                setSaved(true)
              })
              .catch((err: unknown) => {
                setError(
                  err instanceof Error ? err.message : "Could not save your review."
                )
              })
              .finally(() => setBusy(false))
          }}
        >
          {busy ? "Saving…" : existing ? "Save changes" : "Submit review"}
        </GoldButton>
        {existing && editing ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEditing(false)
              setRating(existing.rating)
              setComment(existing.comment ?? "")
              setError(null)
            }}
            className="inline-flex min-h-[44px] items-center px-3 text-xs font-medium text-maroon/55 hover:text-maroon"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}

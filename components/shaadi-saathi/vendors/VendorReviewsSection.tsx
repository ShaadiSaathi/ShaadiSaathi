"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { StarRow } from "@/components/shaadi-saathi/vendors/LeaveVendorReview"
import { subscribeVendorReviews } from "@/lib/firebase/vendor-reviews"
import { replyToVendorReviewApi } from "@/lib/firebase/reviews-client"
import type { FirestoreVendorReview } from "@/lib/firebase/types"
import { EVENTS } from "@/lib/mockData"
import type { VendorReview } from "@/lib/mockVendors"
import EmptyState from "@/components/shaadi-saathi/app/EmptyState"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { EmptyReviewsIllustration } from "@/components/shaadi-saathi/app/empty-illustrations"
import { ReviewListSkeleton } from "@/components/shaadi-saathi/app/skeletons"

function formatReviewDate(ms: number): string {
  if (!ms) return ""
  try {
    return new Date(ms).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function ReviewCard({
  familyName,
  rating,
  comment,
  meta,
  vendorReply,
  footerExtra,
}: {
  familyName: string
  rating: number
  comment?: string
  meta: string
  vendorReply?: string
  footerExtra?: ReactNode
}) {
  return (
    <blockquote className="relative rounded-2xl border border-gold/30 bg-white p-5 shadow-sm">
      <div
        className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-gold/40"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2">
        <StarRow rating={rating} size="sm" />
        <span className="text-xs text-maroon/50">{meta}</span>
      </div>
      {comment ? (
        <p className="mt-3 font-display text-sm italic leading-relaxed text-maroon-dark">
          &ldquo;{comment}&rdquo;
        </p>
      ) : (
        <p className="mt-3 text-sm text-maroon/55">Rated {rating} out of 5</p>
      )}
      <footer className="mt-4 border-t border-gold/15 pt-3 text-xs text-maroon/60">
        <span className="font-semibold text-maroon">{familyName}</span>
      </footer>
      {vendorReply ? (
        <div className="mt-3 rounded-xl bg-ivory/80 px-3 py-2 text-sm text-maroon/75">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon/45">
            Vendor reply
          </p>
          <p className="mt-1 leading-relaxed">{vendorReply}</p>
        </div>
      ) : null}
      {footerExtra}
    </blockquote>
  )
}

type VendorReviewsSectionProps = {
  vendorId: string
  /** Aggregate from vendor doc — shown when live reviews exist or as headline */
  rating: number
  reviewCount: number
  /** Mock-mode fallback reviews */
  mockReviews?: VendorReview[]
  /** When true, vendor can reply to reviews that lack a reply */
  allowVendorReply?: boolean
  emptyTitle?: string
  heading?: string
}

/** Public / vendor review list with empty state. Live data in Firebase mode. */
export default function VendorReviewsSection({
  vendorId,
  rating,
  reviewCount,
  mockReviews = [],
  allowVendorReply = false,
  emptyTitle = "No reviews yet",
  heading = "What families say",
}: VendorReviewsSectionProps) {
  const { isFirebaseMode } = useAuth()
  const [reviews, setReviews] = useState<FirestoreVendorReview[]>([])
  const [loading, setLoading] = useState(isFirebaseMode)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null)
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseMode || !vendorId) {
      setLoading(false)
      setReviews([])
      return
    }
    setLoading(true)
    const unsub = subscribeVendorReviews(
      vendorId,
      (list) => {
        setReviews(list)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [isFirebaseMode, vendorId])

  if (!isFirebaseMode) {
    if (mockReviews.length === 0) {
      return (
        <section aria-labelledby="reviews-heading" className="mb-8">
          <h2
            id="reviews-heading"
            className="mb-3 font-display text-lg font-semibold text-maroon-dark"
          >
            {heading}
          </h2>
          <EmptyState
            illustration={<EmptyReviewsIllustration />}
            title={emptyTitle}
            description="Reviews appear here after families complete a booking."
            action={
              <Link href="/vendors">
                <GoldButton>Browse vendors</GoldButton>
              </Link>
            }
          />
        </section>
      )
    }
    return (
      <section aria-labelledby="reviews-heading" className="mb-8">
        <h2
          id="reviews-heading"
          className="mb-4 font-display text-lg font-semibold text-maroon-dark"
        >
          {heading}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {mockReviews.map((review) => (
            <ReviewCard
              key={review.id}
              familyName={review.author}
              rating={review.rating}
              comment={review.text}
              meta={`${review.location} · ${review.eventType}`}
            />
          ))}
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section aria-labelledby="reviews-heading" className="mb-8">
        <h2
          id="reviews-heading"
          className="mb-3 font-display text-lg font-semibold text-maroon-dark"
        >
          {heading}
        </h2>
        <ReviewListSkeleton />
      </section>
    )
  }

  if (reviews.length === 0) {
    return (
      <section aria-labelledby="reviews-heading" className="mb-8">
        <h2
          id="reviews-heading"
          className="mb-3 font-display text-lg font-semibold text-maroon-dark"
        >
          {heading}
        </h2>
        <EmptyState
          illustration={<EmptyReviewsIllustration />}
          title={emptyTitle}
          description="Reviews appear here after families complete a booking with this vendor."
          action={
            <Link href="/vendors">
              <GoldButton>Browse vendors</GoldButton>
            </Link>
          }
        />
      </section>
    )
  }

  const displayCount = reviewCount > 0 ? reviewCount : reviews.length
  const displayRating = rating > 0 ? rating : reviews[0]?.rating ?? 0

  return (
    <section aria-labelledby="reviews-heading" className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2
          id="reviews-heading"
          className="font-display text-lg font-semibold text-maroon-dark"
        >
          {heading}
        </h2>
        <p className="text-sm text-maroon/60">
          <span className="font-semibold text-maroon-dark">{displayRating}</span>
          {" ★ · "}
          {displayCount} {displayCount === 1 ? "review" : "reviews"}
        </p>
      </div>
      {replyError ? (
        <p className="mb-3 text-sm text-rose-700" role="alert">
          {replyError}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {reviews.map((review) => {
          const eventLabel =
            EVENTS.find((e) => e.id === review.eventId)?.name ?? review.eventId
          const dateLabel = formatReviewDate(review.createdAt)
          return (
            <ReviewCard
              key={review.id}
              familyName={review.familyName}
              rating={review.rating}
              comment={review.comment}
              meta={[eventLabel, dateLabel].filter(Boolean).join(" · ")}
              vendorReply={review.vendorReply}
              footerExtra={
                allowVendorReply && !review.vendorReply ? (
                  <div className="mt-3 space-y-2">
                    <label
                      htmlFor={`reply-${review.id}`}
                      className="block text-xs font-medium text-maroon/55"
                    >
                      Public reply (optional)
                    </label>
                    <textarea
                      id={`reply-${review.id}`}
                      rows={2}
                      value={replyDrafts[review.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [review.id]: e.target.value.slice(0, 1000),
                        }))
                      }
                      className="w-full rounded-xl border border-gold/25 bg-ivory/50 px-3 py-2 text-sm text-maroon-dark focus:border-maroon/40 focus:outline-none focus:ring-2 focus:ring-maroon/15"
                      placeholder="Thank the family or share a brief note…"
                    />
                    <button
                      type="button"
                      disabled={
                        replyBusyId === review.id ||
                        !(replyDrafts[review.id]?.trim().length)
                      }
                      onClick={() => {
                        const text = replyDrafts[review.id]?.trim() ?? ""
                        if (!text) return
                        setReplyBusyId(review.id)
                        setReplyError(null)
                        void replyToVendorReviewApi({
                          bookingId: review.bookingId,
                          reply: text,
                        })
                          .then((updated) => {
                            setReviews((prev) =>
                              prev.map((r) =>
                                r.id === updated.id ? updated : r
                              )
                            )
                            setReplyDrafts((prev) => {
                              const next = { ...prev }
                              delete next[review.id]
                              return next
                            })
                          })
                          .catch((err: unknown) => {
                            setReplyError(
                              err instanceof Error
                                ? err.message
                                : "Could not save reply."
                            )
                          })
                          .finally(() => setReplyBusyId(null))
                      }}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-maroon px-4 text-xs font-semibold text-gold disabled:opacity-50"
                    >
                      {replyBusyId === review.id ? "Saving…" : "Post reply"}
                    </button>
                  </div>
                ) : null
              }
            />
          )
        })}
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import { notFound, useSearchParams } from "next/navigation"
import { use, useEffect, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import BookingModal from "@/components/shaadi-saathi/vendors/BookingModal"
import CategoryIcon from "@/components/shaadi-saathi/vendors/CategoryIcon"
import FamilyConsultThread from "@/components/shaadi-saathi/vendors/FamilyConsultThread"
import MessageModal from "@/components/shaadi-saathi/vendors/MessageModal"
import { NewVendorBadge } from "@/components/shaadi-saathi/shared/StatusBadge"
import { isNewVendor } from "@/lib/mockVendorPortal"
import { EVENTS } from "@/lib/mockData"
import {
  formatPrice,
  formatStartingPrice,
  getCategoryById,
  getEventAvailability,
  getVendorById,
} from "@/lib/mockVendors"

interface VendorDetailPageProps {
  params: Promise<{ id: string }>
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const vendor = getVendorById(id)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [showBooking, setShowBooking] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (searchParams.get("rebook") === "1") setShowBooking(true)
  }, [searchParams])

  if (!vendor) {
    notFound()
  }

  const category = getCategoryById(vendor.categoryId)
  const images = [vendor.coverGradient, ...vendor.galleryGradients]

  return (
    <PageTransition>
      <Link
        href="/vendors"
        className="mb-6 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
      >
        ← Back to vendors
      </Link>

      {/* Photo gallery — PLACEHOLDER gradients until real photos */}
      <section aria-label="Vendor gallery" className="mb-6 overflow-hidden rounded-2xl border border-gold/20">
        <div
          className={`relative h-48 bg-gradient-to-br sm:h-64 ${images[galleryIndex]}`}
        >
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  onClick={() => setGalleryIndex(i)}
                  className="flex h-11 w-11 items-end justify-center pb-3"
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === galleryIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {category && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/8 px-2.5 py-0.5 text-xs font-medium text-maroon/70">
                <CategoryIcon categoryId={vendor.categoryId} className="h-3.5 w-3.5" />
                {category.label}
              </span>
            )}
            <h1 className="mt-2 font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
              {vendor.name}
            </h1>
            <p className="mt-1 text-maroon/60">{vendor.city}</p>
          </div>
          <div className="flex items-center gap-1.5 text-lg font-semibold text-maroon-dark">
            {isNewVendor(vendor.completedJobsCount ?? 0) ? (
              <NewVendorBadge />
            ) : (
              <>
                <svg className="h-5 w-5 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {vendor.rating}
                <span className="text-sm font-normal text-maroon/50">
                  ({vendor.reviewCount} reviews)
                </span>
              </>
            )}
          </div>
        </div>
        <p className="mt-4 leading-relaxed text-maroon/75">{vendor.bio}</p>
        <p className="mt-2 text-sm font-medium text-gold-dark">
          {formatStartingPrice(vendor.startingPrice)}
        </p>
      </header>

      {/* Availability for wedding dates */}
      <section aria-labelledby="availability-heading" className="mb-6">
        <h2 id="availability-heading" className="mb-3 font-display text-lg font-semibold text-maroon-dark">
          Availability for your wedding
        </h2>
        <ul className="space-y-2">
          {EVENTS.map((event) => {
            const { available, label } = getEventAvailability(vendor, event.id)
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-xl border border-gold/15 bg-white px-4 py-3 text-sm"
              >
                {available ? (
                  <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={available ? "text-maroon-dark" : "text-maroon/50"}>{label}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Packages */}
      {vendor.packages && vendor.packages.length > 0 && (
        <section aria-labelledby="packages-heading" className="mb-6">
          <h2 id="packages-heading" className="mb-3 font-display text-lg font-semibold text-maroon-dark">
            Packages
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {vendor.packages.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
              >
                <h3 className="font-display font-semibold text-maroon-dark">{pkg.name}</h3>
                <p className="mt-1 text-sm font-medium text-gold-dark">
                  {formatPrice(pkg.price, pkg.perHead)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-maroon/60">{pkg.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {vendor.reviews.length > 0 && (
        <section aria-labelledby="reviews-heading" className="mb-8">
          <h2 id="reviews-heading" className="mb-4 font-display text-lg font-semibold text-maroon-dark">
            What families say
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {vendor.reviews.map((review) => (
              <blockquote
                key={review.id}
                className="relative rounded-2xl border border-gold/30 bg-white p-5 shadow-sm"
              >
                <div
                  className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-gold/40"
                  aria-hidden="true"
                />
                <p className="font-display text-sm italic leading-relaxed text-maroon-dark">
                  &ldquo;{review.text}&rdquo;
                </p>
                <footer className="mt-4 border-t border-gold/15 pt-3 text-xs text-maroon/60">
                  <span className="font-semibold text-maroon">{review.author}</span>
                  {" · "}
                  {review.location} · {review.eventType}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      <FamilyConsultThread vendor={vendor} onProceed={() => setShowBooking(true)} />

      {/* CTAs */}
      <div className="sticky bottom-20 flex gap-3 border-t border-gold/15 bg-ivory/95 py-4 backdrop-blur-sm lg:bottom-0 lg:static lg:border-0 lg:bg-transparent lg:py-0">
        <GoldButton onClick={() => setShowBooking(true)} className="min-h-[44px] flex-1">
          Request Booking
        </GoldButton>
        <GoldButton variant="ghost" onClick={() => setShowMessage(true)} className="min-h-[44px] flex-1">
          Message Vendor
        </GoldButton>
      </div>

      {showBooking && (
        <BookingModal vendor={vendor} onClose={() => setShowBooking(false)} />
      )}
      {showMessage && (
        <MessageModal vendor={vendor} onClose={() => setShowMessage(false)} />
      )}
    </PageTransition>
  )
}

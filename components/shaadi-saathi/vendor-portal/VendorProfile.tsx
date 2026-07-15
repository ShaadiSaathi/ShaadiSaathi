"use client"

import { useState } from "react"
import Link from "next/link"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { NewVendorBadge } from "@/components/shaadi-saathi/shared/StatusBadge"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { isNewVendor } from "@/lib/mockVendorPortal"
import { VENDOR_CATEGORIES } from "@/lib/mockVendors"

const MOCK_GALLERY = [
  { id: "g1", label: "Walima spread" },
  { id: "g2", label: "Live BBQ counter" },
  { id: "g3", label: "Mehndi high tea" },
  { id: "g4", label: "Dessert station" },
]

/** Vendor profile — business info, reliability, suspension demo toggle */
export default function VendorProfile() {
  const { business, updateBusiness, updateIncidentResponse } = useVendorPortal()
  const { vendorTier, vendorCategories, setVendorCategories } = usePremium()
  const isFeatured = vendorTier === "featured"
  const [bio, setBio] = useState(business.bio)
  const [priceRange, setPriceRange] = useState(business.priceRange)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateBusiness({ bio, priceRange })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (business.suspended) {
    return (
      <PageTransition>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-amber-900">Account temporarily paused</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-amber-800/90">
            Your listing is paused after repeated missed check-ins. To restore your account,
            complete the reliability review and confirm you understand our day-of check-in policy.
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-amber-900/80">
            <li className="flex gap-2">
              <span aria-hidden="true">1.</span>
              Respond to the platform notice sent to {business.email}
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">2.</span>
              Complete 2 successful check-ins on your next bookings
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">3.</span>
              Contact support if you believe this was an error
            </li>
          </ul>
          <button
            type="button"
            onClick={() => updateBusiness({ suspended: false })}
            className="mt-8 inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-900 underline-offset-2 hover:underline"
          >
            Demo: restore account
          </button>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">Profile</h1>
          <p className="mt-1 text-maroon/60">Manage how families see your business</p>
        </div>
        {!isFeatured && (
          <Link href="/vendor/upgrade">
            <GoldButton variant="ghost">Upgrade to Featured</GoldButton>
          </Link>
        )}
      </header>

      <div className="mb-6 rounded-2xl border border-gold/25 bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon to-maroon-dark font-display text-2xl font-bold text-gold">
            LF
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-maroon-dark">{business.name}</h2>
            <p className="text-sm text-maroon/60">
              {business.categoryLabel} · {business.city}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isFeatured && <FeaturedBadge />}
              {isNewVendor(business.completedJobsCount) ? (
                <NewVendorBadge />
              ) : (
                <>
                  <span className="text-gold-dark" aria-label={`Rating ${business.rating} out of 5`}>
                    {"★".repeat(Math.floor(business.rating))}
                    <span className="text-maroon/30">{"★".repeat(5 - Math.floor(business.rating))}</span>
                  </span>
                  <span className="text-sm font-semibold text-maroon-dark">{business.rating}</span>
                  <span className="text-sm text-maroon/50">({business.reviewCount} reviews)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isFeatured && (
          <div id="featured-settings" className="mt-5 scroll-mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4">
            <h3 className="text-sm font-semibold text-maroon-dark">Listed categories (up to 3)</h3>
            <p className="mt-1 text-xs text-maroon/50">Featured vendors can appear in multiple categories.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VENDOR_CATEGORIES.slice(0, 8).map((cat) => {
                const selected = vendorCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        if (vendorCategories.length <= 1) return
                        setVendorCategories(vendorCategories.filter((c) => c !== cat.id))
                      } else if (vendorCategories.length < 3) {
                        setVendorCategories([...vendorCategories, cat.id])
                      }
                    }}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-maroon text-ivory"
                        : "border border-gold/25 bg-white text-maroon/60 hover:border-gold/40"
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-ivory p-4">
          {isNewVendor(business.completedJobsCount) ? (
            <>
              <p className="text-sm font-semibold text-maroon-dark">Building your track record</p>
              <p className="mt-1 text-xs text-maroon/60">
                Complete {5 - business.completedJobsCount} more jobs to earn a reliability score.
                Families see a neutral &ldquo;New to Shaadi Saathi&rdquo; badge until then.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-maroon-dark">
                Reliability score: {business.reliabilityScore}%
              </p>
              <p className="mt-1 text-xs text-maroon/60">
                {business.onTimeCheckInRate}% on-time check-in rate · Based on confirmed arrivals
                vs missed grace periods over your last 12 months.
              </p>
            </>
          )}
          {business.noShowCount === 1 && (
            <p className="mt-2 text-xs text-maroon/50">
              1 missed check-in on record
            </p>
          )}
          {business.noShowCount >= 2 && (
            <p className="mt-2 text-xs text-maroon/50">
              {business.noShowCount} missed check-ins on record
            </p>
          )}
        </div>

        {business.flaggedIncidents.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-maroon/40">
              Flagged incidents (private)
            </p>
            {business.flaggedIncidents.map((inc) => (
              <div key={inc.id} className="rounded-xl border border-gold/20 bg-ivory p-3 text-sm">
                <p className="text-maroon-dark">{inc.description}</p>
                <p className="mt-1 text-xs text-maroon/50">{inc.date}</p>
                <label className="mt-2 block text-xs text-maroon/60">
                  Your context (not shown publicly)
                  <textarea
                    rows={2}
                    defaultValue={inc.vendorResponse}
                    onBlur={(e) => updateIncidentResponse(inc.id, e.target.value)}
                    placeholder="e.g. Family rescheduled last minute..."
                    className="mt-1 w-full rounded-lg border border-gold/25 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-maroon-dark">Business details</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="business-name" className="mb-1 block text-sm font-medium text-maroon/70">
                Business name
              </label>
              <input
                id="business-name"
                type="text"
                value={business.name}
                readOnly
                className="w-full rounded-xl border border-gold/20 bg-ivory/50 px-4 py-3 text-maroon-dark"
              />
            </div>
            <div>
              <label htmlFor="price-range" className="mb-1 block text-sm font-medium text-maroon/70">
                Price range
              </label>
              <input
                id="price-range"
                type="text"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              />
            </div>
            <div>
              <label htmlFor="bio" className="mb-1 block text-sm font-medium text-maroon/70">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-maroon-dark">Photo gallery</h3>
          <p className="mt-1 text-sm text-maroon/60">Mock upload — photos shown to families browsing vendors</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MOCK_GALLERY.map((photo) => (
              <div
                key={photo.id}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-gold/30 bg-ivory text-center text-xs text-maroon/50"
              >
                <svg className="mb-1 h-6 w-6 text-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                {photo.label}
              </div>
            ))}
            <button
              type="button"
              className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/5 text-xs font-medium text-maroon/60 hover:bg-gold/10"
            >
              + Add photo
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-maroon-dark">
                Available on short notice
              </h3>
              <p className="mt-1 text-sm text-maroon/60">
                Show up in Emergency Backup Vendors when families need a last-minute replacement
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={business.emergencyAvailable}
              onClick={() => updateBusiness({ emergencyAvailable: !business.emergencyAvailable })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                business.emergencyAvailable ? "bg-maroon" : "bg-maroon/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  business.emergencyAvailable ? "left-[22px]" : "left-0.5"
                }`}
              />
              <span className="sr-only">Available on short notice</span>
            </button>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <GoldButton type="submit">Save changes</GoldButton>
          {saved && (
            <span className="text-sm font-medium text-emerald-700" role="status">
              Saved!
            </span>
          )}
        </div>

        <section className="rounded-2xl border border-dashed border-maroon/20 bg-maroon/3 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-maroon/40">Demo only</p>
          <p className="mt-1 text-sm text-maroon/60">
            Toggle suspended state to preview what vendors see after repeated no-shows.
          </p>
          <button
            type="button"
            onClick={() =>
              updateBusiness({
                suspended: true,
                noShowCount: 2,
                flaggedIncidents: [
                  {
                    id: "inc-1",
                    date: "2026-06-15",
                    description: "Missed check-in grace window — Mehndi event",
                  },
                  {
                    id: "inc-2",
                    date: "2026-05-20",
                    description: "Missed check-in grace window — Walima event",
                  },
                ],
              })
            }
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon/70 hover:text-maroon"
          >
            Preview suspended account →
          </button>
        </section>
      </form>
    </PageTransition>
  )
}

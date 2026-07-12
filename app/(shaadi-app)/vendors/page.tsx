"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import CategoryGrid from "@/components/shaadi-saathi/vendors/CategoryGrid"
import VendorCard from "@/components/shaadi-saathi/vendors/VendorCard"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EmptyState from "@/components/shaadi-saathi/app/EmptyState"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import { EVENTS, type EventId } from "@/lib/mockData"
import {
  CITIES,
  PRICE_RANGES,
  VENDORS,
  type VendorCategoryId,
} from "@/lib/mockVendors"
import { sortVendorsForBrowse } from "@/lib/premium"

export default function VendorsBrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-maroon/50">
          Loading vendors…
        </div>
      }
    >
      <VendorsBrowseContent />
    </Suspense>
  )
}

function VendorsBrowseContent() {
  const searchParams = useSearchParams()
  const eventParam = searchParams.get("event")
  const eventContext = EVENTS.find((e) => e.id === eventParam)?.id as EventId | undefined

  const [category, setCategory] = useState<VendorCategoryId | "all">("all")
  const [search, setSearch] = useState("")
  const [city, setCity] = useState("all")
  const [priceRange, setPriceRange] = useState(0)
  const [minRating, setMinRating] = useState(0)

  const filtered = useMemo(() => {
    const range = PRICE_RANGES[priceRange] ?? PRICE_RANGES[0]
    const matches = VENDORS.filter((v) => {
      const matchesCategory = category === "all" || v.categoryId === category
      const matchesSearch =
        search === "" ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.bio.toLowerCase().includes(search.toLowerCase())
      const matchesCity = city === "all" || v.city === city
      const matchesPrice = v.startingPrice >= range.min && v.startingPrice <= range.max
      const matchesRating = v.rating >= minRating
      const matchesEvent = !eventContext || v.availableFor.includes(eventContext)
      return (
        matchesCategory &&
        matchesSearch &&
        matchesCity &&
        matchesPrice &&
        matchesRating &&
        matchesEvent
      )
    })
    return sortVendorsForBrowse(matches)
  }, [category, search, city, priceRange, minRating, eventContext])

  return (
    <PageTransition>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            Vendors
          </h1>
          <p className="mt-1 text-maroon/60">
            A curated directory for your shaadi — catering, decor, mehndi, and more.
          </p>
        </div>
        <Link
          href="/vendors/bookings"
          className="text-sm font-semibold text-gold-dark hover:underline"
        >
          My bookings →
        </Link>
      </header>

      {eventContext && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
          <span className="text-sm text-maroon/70">Browsing vendors for</span>
          <EventChip eventId={eventContext} size="sm" />
          <Link href="/vendors" className="ml-auto text-xs font-medium text-maroon/50 hover:text-maroon">
            Clear filter
          </Link>
        </div>
      )}

      {/* Search & filters */}
      <div className="mb-5 space-y-3">
        <label className="sr-only" htmlFor="vendor-search">
          Search vendors
        </label>
        <input
          id="vendor-search"
          type="search"
          placeholder="Search by name or service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm text-maroon-dark placeholder:text-maroon/40 focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Filter by city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
          >
            <option value="all">All cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by price range"
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="flex-1 rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
          >
            {PRICE_RANGES.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by minimum rating"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="flex-1 rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
          >
            <option value={0}>Any rating</option>
            <option value={4}>4+ stars</option>
            <option value={4.5}>4.5+ stars</option>
            <option value={4.8}>4.8+ stars</option>
          </select>
        </div>
      </div>

      <CategoryGrid selected={category} onSelect={setCategory} />

      <section className="mt-6" aria-labelledby="vendor-list-heading">
        <h2 id="vendor-list-heading" className="sr-only">
          Vendor listings
        </h2>

        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            }
            title="No vendors match"
            description="Try adjusting your filters or search — our directory has caterers, photographers, mehndi artists, and more."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  )
}

"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import CategoryGrid from "@/components/shaadi-saathi/vendors/CategoryGrid"
import VendorCard from "@/components/shaadi-saathi/vendors/VendorCard"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EmptyState from "@/components/shaadi-saathi/app/EmptyState"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import { useVendorsDirectory } from "@/components/shaadi-saathi/vendors/VendorsDirectoryContext"
import Button from "@/components/shaadi-saathi/ui/Button"
import { Input, Select } from "@/components/shaadi-saathi/ui/Input"
import { usePlanningPreferences } from "@/components/shaadi-saathi/wedding/usePlanningPreferences"
import { EVENTS, type EventId } from "@/lib/mockData"
import {
  CITIES,
  PRICE_RANGES,
  VENDOR_CATEGORIES,
  type VendorCategoryId,
} from "@/lib/mockVendors"
import { APP_PAGE_HEADER_CLASS } from "@/lib/design/app-form-styles"
import { VendorGridSkeleton } from "@/components/shaadi-saathi/app/skeletons"
import { EmptyVendorsIllustration } from "@/components/shaadi-saathi/app/empty-illustrations"
import { sortVendorsForBrowse } from "@/lib/premium"
import { emptyVendorsCopy, orderVendorCategories, vendorsIntro } from "@/lib/wedding-personalization"

export default function VendorsBrowsePage() {
  return (
    <Suspense
      fallback={<VendorGridSkeleton />}
    >
      <VendorsBrowseContent />
    </Suspense>
  )
}

function VendorsBrowseContent() {
  const searchParams = useSearchParams()
  const eventParam = searchParams.get("event")
  const categoryParam = searchParams.get("category") as VendorCategoryId | null
  const eventContext = EVENTS.find((e) => e.id === eventParam)?.id as EventId | undefined

  const { vendors, loading } = useVendorsDirectory()
  const prefs = usePlanningPreferences()
  const vendorCategories = orderVendorCategories(VENDOR_CATEGORIES, prefs)
  const vendorsEmpty = emptyVendorsCopy(prefs, vendors.length === 0)
  const [category, setCategory] = useState<VendorCategoryId | "all">(
    categoryParam && categoryParam.length > 0 ? categoryParam : "all"
  )
  const [search, setSearch] = useState("")
  const [city, setCity] = useState("all")
  const [priceRange, setPriceRange] = useState(0)
  const [minRating, setMinRating] = useState(0)

  const cityOptions = useMemo(() => {
    const fromVendors = vendors.map((v) => v.city).filter(Boolean)
    return [...new Set([...CITIES, ...fromVendors])].sort()
  }, [vendors])

  const filtered = useMemo(() => {
    const range = PRICE_RANGES[priceRange] ?? PRICE_RANGES[0]
    const matches = vendors.filter((v) => {
      const matchesCategory = category === "all" || v.categoryId === category
      const matchesSearch =
        search === "" ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.bio.toLowerCase().includes(search.toLowerCase())
      const matchesCity = city === "all" || v.city === city
      const price = v.startingPrice > 0 ? v.startingPrice : 0
      const matchesPrice =
        price === 0
          ? range.min === 0
          : price >= range.min && price <= range.max
      const matchesRating = minRating === 0 || v.rating >= minRating
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
  }, [vendors, category, search, city, priceRange, minRating, eventContext])

  return (
    <PageTransition>
      <header className={`${APP_PAGE_HEADER_CLASS} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h1 className="shaadi-page-title">
            Vendors
          </h1>
          <p className="mt-1 text-maroon/60">
            {vendorsIntro(prefs)}
          </p>
        </div>
        <Button href="/vendors/bookings" variant="ghost">
          My bookings →
        </Button>
      </header>

      {eventContext && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
          <span className="text-sm text-maroon/70">Browsing vendors for</span>
          <EventChip eventId={eventContext} size="sm" />
          <Link href="/vendors" className="ml-auto inline-flex min-h-[44px] items-center text-xs font-medium text-maroon/50 hover:text-maroon">
            Clear filter
          </Link>
        </div>
      )}

      <div className="mb-5 space-y-3">
        <label className="sr-only" htmlFor="vendor-search">
          Search vendors
        </label>
        <Input
          id="vendor-search"
          type="search"
          placeholder="Search by name or service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] w-full"
        />

        <div className="flex flex-col gap-2 md:flex-row">
          <Select
            aria-label="Filter by city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="min-h-[44px] flex-1"
          >
            <option value="all">All cities</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by price range"
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="min-h-[44px] flex-1"
          >
            {PRICE_RANGES.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by minimum rating"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="min-h-[44px] flex-1"
          >
            <option value={0}>Any rating</option>
            <option value={4}>4+ stars</option>
            <option value={4.5}>4.5+ stars</option>
            <option value={4.8}>4.8+ stars</option>
          </Select>
        </div>
      </div>

      <CategoryGrid selected={category} onSelect={setCategory} categories={vendorCategories} />

      <section className="mt-6" aria-labelledby="vendor-list-heading">
        <h2 id="vendor-list-heading" className="sr-only">
          Vendor listings
        </h2>

        {loading ? (
          <VendorGridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={<EmptyVendorsIllustration />}
            title={vendorsEmpty.title}
            description={vendorsEmpty.description}
            action={
              vendors.length === 0 ? (
                <Button href="/vendors/bookings" variant="ghost">
                  View bookings →
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  )
}

import Link from "next/link"
import CategoryIcon from "./CategoryIcon"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import type { Vendor } from "@/lib/mockVendors"
import { formatStartingPrice, getCategoryById } from "@/lib/mockVendors"

interface VendorCardProps {
  vendor: Vendor
}

/** Elegant vendor directory card — PLACEHOLDER cover uses gradient until real photos added */
export default function VendorCard({ vendor }: VendorCardProps) {
  const category = getCategoryById(vendor.categoryId)

  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className="group overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm transition-all hover:border-gold/35 hover:shadow-md"
    >
      <div
        className={`relative h-36 bg-gradient-to-br ${vendor.coverGradient}`}
        aria-hidden="true"
      >
        {/* PLACEHOLDER: <Image src={vendor.coverUrl} alt="" fill className="object-cover" /> */}
        {vendor.subscriptionTier === "featured" || vendor.featured ? (
          <FeaturedBadge className="absolute left-3 top-3" />
        ) : null}
        {vendor.emergencyAvailable && (
          <span className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            Short notice
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-maroon-dark group-hover:text-maroon">
              {vendor.name}
            </h3>
            <p className="mt-0.5 text-xs text-maroon/50">{vendor.city}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-maroon-dark">
            <svg className="h-4 w-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {vendor.rating}
          </div>
        </div>

        {category && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/8 px-2.5 py-0.5 text-xs font-medium text-maroon/70">
            <CategoryIcon categoryId={vendor.categoryId} className="h-3.5 w-3.5 text-gold-dark" />
            {category.shortLabel}
          </span>
        )}

        <p className="mt-3 text-sm font-medium text-gold-dark">
          {formatStartingPrice(vendor.startingPrice)}
        </p>
      </div>
    </Link>
  )
}

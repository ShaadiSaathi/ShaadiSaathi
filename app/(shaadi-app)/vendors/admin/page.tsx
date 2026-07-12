"use client"

import Link from "next/link"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import { useVendorBookings } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"
import { getAllVendors, getCategoryById } from "@/lib/mockVendors"

/** Mock vendor admin view — PLACEHOLDER for full vendor portal */
export default function VendorAdminPage() {
  const { vendorReliability } = useVendorBookings()
  const vendors = getAllVendors()

  return (
    <PageTransition>
      <header className="mb-8">
        <Link
          href="/vendors"
          className="mb-2 inline-flex text-sm font-medium text-maroon/60 hover:text-maroon"
        >
          ← Back to vendors
        </Link>
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
          Vendor reliability (admin)
        </h1>
        <p className="mt-1 text-sm text-maroon/60">
          Internal view — no-show flags and suspension status. Not visible to families.
        </p>
      </header>

      <ul className="space-y-3">
        {vendors.map((vendor) => {
          const rel = vendorReliability[vendor.id] ?? {
            reliabilityScore: vendor.reliabilityScore,
            noShowCount: vendor.noShowCount,
            suspended: vendor.suspended ?? false,
          }
          const category = getCategoryById(vendor.categoryId)

          return (
            <li
              key={vendor.id}
              className="rounded-xl border border-gold/15 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-maroon-dark">{vendor.name}</p>
                  <p className="text-xs text-maroon/50">{category?.label} · {vendor.city}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-maroon-dark">
                    Score: {rel.reliabilityScore}
                  </span>
                  {rel.noShowCount > 0 && (
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                      {rel.noShowCount} no-show{rel.noShowCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {rel.suspended && (
                    <span className="rounded-full bg-maroon px-2.5 py-0.5 text-xs font-semibold text-ivory">
                      Suspended
                    </span>
                  )}
                </div>
              </div>
              {rel.noShowCount >= 1 && (
                <p className="mt-2 text-xs text-maroon/50">
                  Profile flagged after no-show. {rel.noShowCount >= 2
                    ? "Suspended from new bookings."
                    : "One more no-show triggers suspension."}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </PageTransition>
  )
}

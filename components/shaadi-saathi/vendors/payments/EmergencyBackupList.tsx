"use client"

import Link from "next/link"
import VendorCard from "@/components/shaadi-saathi/vendors/VendorCard"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import type { VendorCategoryId } from "@/lib/mockVendors"
import { getAllVendors } from "@/lib/mockVendors"
import { sortEmergencyBackups } from "@/lib/premium"

interface EmergencyBackupListProps {
  categoryId: VendorCategoryId
  city: string
  excludeVendorId: string
  max?: number
}

/** Short list of emergencyAvailable vendors — priority sort for Premium families */
export default function EmergencyBackupList({
  categoryId,
  city,
  excludeVendorId,
  max = 3,
}: EmergencyBackupListProps) {
  const { isFamilyPremium } = usePremium()

  const backups = sortEmergencyBackups(
    getAllVendors().filter(
      (v) =>
        v.id !== excludeVendorId &&
        v.categoryId === categoryId &&
        v.emergencyAvailable &&
        !v.suspended &&
        (v.city === city || v.city === "Lahore")
    ),
    isFamilyPremium
  ).slice(0, max)

  if (backups.length === 0) {
    return (
      <p className="text-sm text-maroon/60">
        Contact us for help finding a last-minute replacement in {city}.
      </p>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h4 className="font-display text-sm font-semibold text-maroon-dark">
          Emergency backup vendors
        </h4>
        {isFamilyPremium && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
            Priority
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-maroon/60">
        Available on short notice in your area — same category as your original booking.
        {isFamilyPremium && " Premium families see featured vendors first."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {backups.map((v) => (
          <div key={v.id} className="relative">
            {isFamilyPremium && v.subscriptionTier === "featured" && (
              <span className="absolute -top-2 right-2 z-10 rounded-full border border-gold/40 bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold-dark">
                Priority
              </span>
            )}
            <VendorCard vendor={v} />
          </div>
        ))}
      </div>
      <Link
        href={`/vendors?category=${categoryId}`}
        className="mt-3 inline-block text-sm font-medium text-gold-dark hover:underline"
      >
        See more in this category →
      </Link>
    </div>
  )
}

import Link from "next/link"
import type { VendorBooking } from "@/lib/mockVendors"
import { formatPrice, getVendorById } from "@/lib/mockVendors"
import EmergencyBackupList from "./EmergencyBackupList"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"

interface NoShowStateProps {
  booking: VendorBooking
}

/** Calm, reassuring no-show UI — not a cold error state */
export default function NoShowState({ booking }: NoShowStateProps) {
  const vendor = getVendorById(booking.vendorId)
  const refundAmount = booking.payment?.refundAmount ?? booking.payment?.depositAmount ?? 0

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4">
      <div>
        <h3 className="font-display text-base font-semibold text-maroon-dark">
          We&apos;ve got you covered
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-maroon/70">
          {vendor?.name ?? "Your vendor"} wasn&apos;t able to make it to your event. That&apos;s
          stressful — but your deposit is safe, and we&apos;re here to help you find a backup.
        </p>
      </div>

      {refundAmount > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-900">
            {formatPrice(refundAmount)} refunded to your account
          </p>
          <p className="mt-0.5 text-xs text-emerald-800/70">
            {/* PLACEHOLDER: real refund via payment processor */}
            Full deposit returned — typically within 3–5 business days.
          </p>
        </div>
      )}

      {vendor && (
        <EmergencyBackupList
          categoryId={vendor.categoryId}
          city={vendor.city}
          excludeVendorId={vendor.id}
        />
      )}

      <Link href="/vendors">
        <GoldButton variant="ghost" className="w-full">
          Browse all vendors
        </GoldButton>
      </Link>
    </div>
  )
}

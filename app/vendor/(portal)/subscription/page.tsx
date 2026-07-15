"use client"

import Link from "next/link"
import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { VENDOR_FEATURED_PRICE_PKR } from "@/lib/premium"

export default function VendorSubscriptionPage() {
  const { vendorTier, nextBillingDate, cancelVendorSubscription } = usePremium()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const isFeatured = vendorTier === "featured"

  function handleCancel() {
    // TODO: real payment integration here — cancel subscription via payment provider API
    cancelVendorSubscription()
    setShowCancelConfirm(false)
  }

  return (
    <PageTransition>
      <header className="mb-8">
        <Link href="/vendor/dashboard" className="inline-flex min-h-[44px] items-center text-sm font-medium text-maroon/50 hover:text-maroon">
          ← Dashboard
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
          Manage subscription
        </h1>
      </header>

      <div className="rounded-2xl border border-gold/25 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-maroon/50">Current plan</p>
            <p className="mt-1 flex items-center gap-2 font-display text-xl font-semibold text-maroon-dark">
              {isFeatured ? (
                <>
                  Featured
                  <FeaturedBadge />
                </>
              ) : (
                "Basic (Free)"
              )}
            </p>
          </div>
          {isFeatured && (
            <div className="text-right">
              <p className="text-sm text-maroon/50">Monthly</p>
              <p className="font-semibold text-maroon-dark">
                Rs. {VENDOR_FEATURED_PRICE_PKR.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {isFeatured && nextBillingDate && (
          <p className="mt-4 text-sm text-maroon/60">
            Next billing date: <span className="font-medium text-maroon-dark">{nextBillingDate}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {!isFeatured ? (
            <Link href="/vendor/upgrade">
              <GoldButton>Upgrade to Featured</GoldButton>
            </Link>
          ) : (
            <GoldButton variant="ghost" onClick={() => setShowCancelConfirm(true)}>
              Cancel subscription
            </GoldButton>
          )}
        </div>
      </div>

      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-maroon-dark/40 p-4"
          role="dialog"
          aria-labelledby="cancel-title"
        >
          <div className="max-w-md rounded-2xl border border-gold/30 bg-white p-6 shadow-xl">
            <h2 id="cancel-title" className="font-display text-lg font-semibold text-maroon-dark">
              Downgrade to Basic?
            </h2>
            <p className="mt-2 text-sm text-maroon/60">
              You&apos;ll lose boosted placement, the Featured badge, and early access to new requests.
              Your listing will remain active on the Basic plan.
            </p>
            <div className="mt-5 flex gap-3">
              <GoldButton type="button" onClick={handleCancel}>
                Confirm downgrade
              </GoldButton>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm text-maroon/50 hover:text-maroon"
              >
                Keep Featured
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}

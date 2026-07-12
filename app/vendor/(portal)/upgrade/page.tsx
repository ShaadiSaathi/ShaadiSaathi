"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import PlanComparisonTable from "@/components/shaadi-saathi/premium/PlanComparisonTable"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import {
  VENDOR_FEATURED_PRICE_PKR,
  VENDOR_PLAN_ROWS,
} from "@/lib/premium"

const FEATURE_MESSAGES: Record<string, string> = {
  visibility:
    "Boosted visibility and multi-category listing are Featured benefits — subscribe to unlock them.",
}

function VendorUpgradeContent() {
  const searchParams = useSearchParams()
  const featureHint = searchParams.get("feature")
  const featureMessage = featureHint ? FEATURE_MESSAGES[featureHint] : null
  const {
    vendorTier,
    subscribeVendorFeatured,
    showVendorConfirmation,
    dismissVendorConfirmation,
    nextBillingDate,
  } = usePremium()
  const [loading, setLoading] = useState(false)
  const isFeatured = vendorTier === "featured"

  async function handleSubscribe() {
    setLoading(true)
    try {
      // TODO: real payment integration here — recurring subscription via Safepay / Stripe
      await subscribeVendorFeatured()
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <header className="mb-8">
        <Link href="/vendor/profile" className="text-sm font-medium text-maroon/50 hover:text-maroon">
          ← Back to profile
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            Featured Vendor
          </h1>
          {isFeatured && <FeaturedBadge />}
        </div>
        <p className="mt-2 max-w-xl text-maroon/60">
          Stand out to families, get early access to booking requests, and list across more
          categories — built for vendors who work weddings every week.
        </p>
        {featureMessage && !isFeatured && (
          <p className="mt-3 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-maroon-dark">
            {featureMessage}
          </p>
        )}
      </header>

      {isFeatured ? (
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-ivory p-8">
          <p className="font-display text-xl font-semibold text-maroon-dark">
            You&apos;re on the Featured plan
          </p>
          <p className="mt-2 text-sm text-maroon/60">
            Boosted placement, Featured badge, and early access are active on your profile.
          </p>
          {nextBillingDate && (
            <p className="mt-3 text-sm text-maroon/70">
              Next billing date:{" "}
              <span className="font-medium">{nextBillingDate}</span>
            </p>
          )}
          <Link href="/vendor/subscription" className="mt-5 inline-block text-sm font-semibold text-gold-dark hover:underline">
            Manage subscription →
          </Link>
        </div>
      ) : (
        <>
          <PlanComparisonTable
            freeLabel="Basic"
            premiumLabel="Featured"
            premiumColumnTitle="Featured"
            rows={VENDOR_PLAN_ROWS}
          />
          <p className="mt-3 text-xs text-maroon/40">* Reduced commission applies when platform fees launch.</p>

          <div className="mt-8 rounded-2xl border border-gold/25 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-maroon/50">Monthly subscription</p>
            <p className="mt-1 font-display text-3xl font-bold text-maroon-dark">
              Rs. {VENDOR_FEATURED_PRICE_PKR.toLocaleString()}
              <span className="text-base font-normal text-maroon/50">/month</span>
            </p>
            <GoldButton
              type="button"
              className="mt-5 w-full max-w-xs"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? "Processing…" : "Subscribe — Featured"}
            </GoldButton>
            <p className="mt-3 text-xs text-maroon/40">
              Mock payment — no charge. Real billing will connect here later.
            </p>
          </div>
        </>
      )}

      <AnimatePresence>
        {showVendorConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-maroon-dark/40 p-4"
            role="dialog"
            aria-labelledby="vendor-success-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md rounded-2xl border border-gold/30 bg-white p-8 text-center shadow-xl"
            >
              <p className="text-4xl" aria-hidden="true">
                ✨
              </p>
              <h2 id="vendor-success-title" className="mt-3 font-display text-xl font-bold text-maroon-dark">
                Welcome to Featured!
              </h2>
              <p className="mt-2 text-maroon/70">
                Your profile is now boosted. Families will see your Featured badge and priority placement.
              </p>
              <GoldButton type="button" className="mt-6 w-full" onClick={dismissVendorConfirmation}>
                Go to dashboard
              </GoldButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

export default function VendorUpgradePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-maroon/50">Loading…</div>}>
      <VendorUpgradeContent />
    </Suspense>
  )
}

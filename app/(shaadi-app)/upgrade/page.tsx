"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import PlanComparisonTable from "@/components/shaadi-saathi/premium/PlanComparisonTable"
import PremiumBadge from "@/components/shaadi-saathi/premium/PremiumBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import {
  FAMILY_PLAN_ROWS,
  FAMILY_PREMIUM_PRICE_PKR,
} from "@/lib/premium"

const FEATURE_MESSAGES: Record<string, string> = {
  seating: "Seating Planner is a Premium feature — upgrade to unlock it.",
  themes: "Custom invite themes are a Premium feature — upgrade to unlock them.",
}

function FamilyUpgradeContent() {
  const searchParams = useSearchParams()
  const featureHint = searchParams.get("feature")
  const featureMessage = featureHint ? FEATURE_MESSAGES[featureHint] : null
  const {
    isFamilyPremium,
    purchaseFamilyPremium,
    showPremiumConfirmation,
    dismissPremiumConfirmation,
  } = usePremium()
  const [loading, setLoading] = useState(false)

  async function handlePurchase() {
    setLoading(true)
    try {
      // TODO: real payment integration here — redirect to Safepay / JazzCash / Easypaisa / Stripe checkout
      await purchaseFamilyPremium()
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <header className="mb-8">
        <Link href="/settings" className="text-sm font-medium text-maroon/50 hover:text-maroon">
          ← Back to settings
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            Shaadi Saathi Premium
          </h1>
          {isFamilyPremium && <PremiumBadge />}
        </div>
        <p className="mt-2 max-w-xl text-maroon/60">
          One unlock for your whole wedding — unlimited guests, beautiful invite themes, and
          seating planning. No monthly fees.
        </p>
        {featureMessage && !isFamilyPremium && (
          <p className="mt-3 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-maroon-dark">
            {featureMessage}
          </p>
        )}
      </header>

      {isFamilyPremium ? (
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-ivory p-8 text-center">
          <p className="font-display text-xl font-semibold text-maroon-dark">
            Premium is active for your wedding
          </p>
          <p className="mt-2 text-sm text-maroon/60">
            Enjoy unlimited events and guests, custom invite themes, and the seating planner.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/settings#invite-themes">
              <GoldButton variant="ghost">Invite theme settings</GoldButton>
            </Link>
            <Link href="/seating">
              <GoldButton>Open seating planner</GoldButton>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <PlanComparisonTable
            freeLabel="Free"
            premiumLabel="Premium"
            premiumColumnTitle="Premium"
            rows={FAMILY_PLAN_ROWS}
          />

          <div className="mt-8 rounded-2xl border border-gold/25 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-maroon/50">One-time, covers your whole wedding</p>
            <p className="mt-1 font-display text-3xl font-bold text-maroon-dark">
              Rs. {FAMILY_PREMIUM_PRICE_PKR.toLocaleString()}
            </p>
            <GoldButton
              type="button"
              className="mt-5 w-full max-w-xs"
              onClick={handlePurchase}
              disabled={loading}
            >
              {loading ? "Processing…" : "Get Premium"}
            </GoldButton>
            <p className="mt-3 text-xs text-maroon/40">
              Mock payment — no charge. Real checkout will connect here later.
            </p>
          </div>
        </>
      )}

      <AnimatePresence>
        {showPremiumConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-maroon-dark/40 p-4"
            role="dialog"
            aria-labelledby="premium-success-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md rounded-2xl border border-gold/30 bg-white p-8 text-center shadow-xl"
            >
              <p className="text-4xl" aria-hidden="true">
                🎉
              </p>
              <h2 id="premium-success-title" className="mt-3 font-display text-xl font-bold text-maroon-dark">
                You&apos;re all set!
              </h2>
              <p className="mt-2 text-maroon/70">
                Premium is now active for your wedding. Unlimited guests, themes, and seating — enjoy!
              </p>
              <GoldButton type="button" className="mt-6 w-full" onClick={dismissPremiumConfirmation}>
                Continue planning
              </GoldButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

export default function FamilyUpgradePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-maroon/50">Loading…</div>}>
      <FamilyUpgradeContent />
    </Suspense>
  )
}

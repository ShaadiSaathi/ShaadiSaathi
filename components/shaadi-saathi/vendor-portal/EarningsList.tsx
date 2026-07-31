"use client"

import { useMemo, useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import StatCard from "@/components/shaadi-saathi/app/StatCard"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { formatPrice } from "@/lib/mockVendors"
import {
  BALANCE_STATUS_STYLES,
  getBalanceStatusLabel,
  getVendorPayoutDisplay,
  type BookingPayment,
} from "@/lib/mockPayments"
import { getPendingPayouts } from "@/lib/mockVendorPortal"
import type { EarningsTransaction } from "@/lib/mockVendorPortal"

type StatusFilter =
  | "all"
  | "held"
  | "payout_sent"
  | "payout_failed"
  | "pending_payout"

/** Earnings summary + transaction history with real Safepay payout status */
export default function EarningsList({ embedded = false }: { embedded?: boolean }) {
  const { earnings, jobs } = useVendorPortal()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const pendingPayouts = getPendingPayouts(jobs)
  const nowMonth = new Date().toISOString().slice(0, 7)
  const earnedThisMonth = earnings
    .filter((t) => t.date.startsWith(nowMonth) && isPayoutSent(t))
    .reduce((sum, t) => sum + t.amount, 0)

  const awaitingBank = jobs.reduce((sum, j) => {
    const p = j.payment
    if (p.depositStatus !== "released") return sum
    if (p.safepayPayoutStatus === "P_SETTLED") return sum
    return sum + p.depositAmount
  }, 0)

  const filtered = useMemo(() => {
    if (statusFilter === "all") return earnings
    if (statusFilter === "held") {
      return earnings.filter(
        (t) => t.depositStatus === "held" || t.balanceStatus === "charged_pending_release"
      )
    }
    if (statusFilter === "payout_sent") {
      return earnings.filter((t) => isPayoutSent(t))
    }
    if (statusFilter === "payout_failed") {
      return earnings.filter(
        (t) =>
          t.safepayPayoutStatus === "P_FAILED" ||
          t.safepayPayoutStatus === "P_REJECTED" ||
          Boolean(t.safepayPayoutError)
      )
    }
    // pending_payout: released but not settled
    return earnings.filter((t) => {
      if (t.type !== "deposit") return false
      return (
        t.depositStatus === "released" &&
        t.safepayPayoutStatus !== "P_SETTLED"
      )
    })
  }, [earnings, statusFilter])

  return (
    <PageTransition>
      {!embedded && (
        <header className="mb-8">
          <h1 className="shaadi-page-title">Earnings</h1>
          <p className="mt-1 text-maroon/60">Deposits, balances, and payout history</p>
        </header>
      )}
      {embedded && (
        <header className="mb-6">
          <h1 className="shaadi-page-title">Earnings</h1>
          <p className="mt-1 text-maroon/60">Deposits, balances, and payout history</p>
        </header>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Earned this month"
          value={formatPrice(earnedThisMonth)}
          subtext="Payouts sent to your bank"
        />
        <StatCard
          label="Pending payouts"
          value={formatPrice(pendingPayouts)}
          subtext="Still held until check-in"
        />
        <StatCard
          label="Awaiting bank transfer"
          value={formatPrice(awaitingBank)}
          subtext="Released — payout in progress or pending"
        />
      </section>

      <section aria-labelledby="transactions-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="transactions-heading" className="shaadi-section-title sm:text-xl">
            Transaction history
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(
              [
                ["all", "All"],
                ["held", "Held"],
                ["pending_payout", "Payout pending"],
                ["payout_sent", "Payout sent"],
                ["payout_failed", "Failed"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === key
                    ? "bg-maroon text-ivory"
                    : "border border-gold/25 text-maroon/70 hover:bg-gold/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/30 p-8 text-center text-maroon/60">
            No transactions match this filter.
          </div>
        ) : (
          <ul className="shaadi-card divide-y divide-gold/15 overflow-hidden">
            {filtered.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </section>
    </PageTransition>
  )
}

function isPayoutSent(tx: EarningsTransaction): boolean {
  return tx.safepayPayoutStatus === "P_SETTLED"
}

function TransactionRow({ tx }: { tx: EarningsTransaction }) {
  if (tx.type === "deposit") {
    const paymentLike = {
      depositStatus: tx.depositStatus ?? "held",
      safepayPayoutStatus: tx.safepayPayoutStatus,
      safepayPayoutError: tx.safepayPayoutError,
    } as BookingPayment
    const display = getVendorPayoutDisplay(paymentLike)

    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="font-medium text-maroon-dark">{tx.label}</p>
          <p className="text-sm text-maroon/50">
            {tx.eventName} · Deposit ·{" "}
            {new Date(tx.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {display.detail ? (
            <p className="mt-1 max-w-md text-xs text-maroon/45">{display.detail}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${display.style}`}
          >
            {display.label}
          </span>
          <span className="shaadi-stat-value text-lg">{formatPrice(tx.amount)}</span>
        </div>
      </li>
    )
  }

  const statusLabel = getBalanceStatusLabel(tx.balanceStatus ?? "pending_online", {
    totalPrice: tx.amount,
    depositAmount: 0,
    depositPercent: 0,
    balanceAmount: tx.amount,
    paymentPath: "online",
    depositStatus: "released",
    balanceStatus: tx.balanceStatus ?? "pending_online",
  })
  const statusStyle = BALANCE_STATUS_STYLES[tx.balanceStatus ?? "pending_online"]

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="font-medium text-maroon-dark">{tx.label}</p>
        <p className="text-sm text-maroon/50">
          {tx.eventName} · Balance ·{" "}
          {new Date(tx.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle}`}
        >
          {statusLabel}
        </span>
        <span className="shaadi-stat-value text-lg">{formatPrice(tx.amount)}</span>
      </div>
    </li>
  )
}

"use client"

import { useMemo, useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import StatCard from "@/components/shaadi-saathi/app/StatCard"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { formatPrice } from "@/lib/mockVendors"
import {
  DEPOSIT_STATUS_STYLES,
  BALANCE_STATUS_STYLES,
  getDepositStatusLabel,
  getBalanceStatusLabel,
} from "@/lib/mockPayments"
import { getPendingPayouts } from "@/lib/mockVendorPortal"
import type { EarningsTransaction } from "@/lib/mockVendorPortal"

type StatusFilter = "all" | "held" | "released" | "disputed"

/** Earnings summary + transaction history with filters */
export default function EarningsList({ embedded = false }: { embedded?: boolean }) {
  const { earnings, jobs } = useVendorPortal()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const pendingPayouts = getPendingPayouts(jobs)
  const earnedThisMonth = earnings
    .filter((t) => t.date.startsWith("2026-07") && isReleased(t))
    .reduce((sum, t) => sum + t.amount, 0)

  const filtered = useMemo(() => {
    if (statusFilter === "all") return earnings
    if (statusFilter === "held") {
      return earnings.filter(
        (t) => t.depositStatus === "held" || t.balanceStatus === "charged_pending_release"
      )
    }
    if (statusFilter === "released") {
      return earnings.filter((t) => isReleased(t))
    }
    return earnings.filter(
      (t) =>
        t.depositStatus === "refunded" ||
        t.balanceStatus === "charged_pending_release" && t.depositStatus === "released"
    )
  }, [earnings, statusFilter])

  return (
    <PageTransition>
      {!embedded && (
        <header className="mb-8">
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">Earnings</h1>
          <p className="mt-1 text-maroon/60">Deposits, balances, and payout history</p>
        </header>
      )}
      {embedded && (
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">Earnings</h1>
          <p className="mt-1 text-maroon/60">Deposits, balances, and payout history</p>
        </header>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Earned this month"
          value={formatPrice(earnedThisMonth)}
          subtext="Released payouts"
        />
        <StatCard
          label="Pending payouts"
          value={formatPrice(pendingPayouts)}
          subtext="Deposits & balances held"
        />
        <StatCard
          label="Next payout"
          value="Jul 18"
          subtext="Weekly release (mock)"
        />
      </section>

      <section aria-labelledby="transactions-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="transactions-heading" className="font-display text-xl font-semibold text-maroon-dark">
            Transaction history
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(
              [
                ["all", "All"],
                ["held", "Held"],
                ["released", "Released"],
                ["disputed", "Disputed"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          <ul className="divide-y divide-gold/15 rounded-2xl border border-gold/25 bg-white">
            {filtered.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </section>
    </PageTransition>
  )
}

function isReleased(tx: EarningsTransaction): boolean {
  if (tx.type === "deposit") {
    return tx.depositStatus === "released"
  }
  return (
    tx.balanceStatus === "released_online" ||
    tx.balanceStatus === "paid_in_person"
  )
}

function TransactionRow({ tx }: { tx: EarningsTransaction }) {
  const statusLabel =
    tx.type === "deposit"
      ? getDepositStatusLabel(tx.depositStatus ?? "held")
      : getBalanceStatusLabel(tx.balanceStatus ?? "pending_online", {
          totalPrice: tx.amount,
          depositAmount: 0,
          depositPercent: 0,
          balanceAmount: tx.amount,
          paymentPath: "online",
          depositStatus: "released",
          balanceStatus: tx.balanceStatus ?? "pending_online",
        })

  const statusStyle =
    tx.type === "deposit"
      ? DEPOSIT_STATUS_STYLES[tx.depositStatus ?? "held"]
      : BALANCE_STATUS_STYLES[tx.balanceStatus ?? "pending_online"]

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="font-medium text-maroon-dark">{tx.label}</p>
        <p className="text-sm text-maroon/50">
          {tx.eventName} · {tx.type === "deposit" ? "Deposit" : "Balance"} ·{" "}
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
        <span className="font-display text-lg font-bold text-maroon-dark">
          {formatPrice(tx.amount)}
        </span>
      </div>
    </li>
  )
}

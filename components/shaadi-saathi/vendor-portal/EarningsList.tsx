"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import StatCard from "@/components/shaadi-saathi/app/StatCard"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { formatPrice } from "@/lib/mockVendors"
import {
  getBookingPayoutVisibility,
  getVendorEarningsSummary,
  type VendorPayoutStatus,
} from "@/lib/vendor-earnings"
import type { VendorJob } from "@/lib/mockVendorPortal"

type StatusFilter = "all" | VendorPayoutStatus

/** Earnings — Owed / Pending / Paid visibility (Safepay bank payouts not live yet). */
export default function EarningsList({ embedded = false }: { embedded?: boolean }) {
  const { jobs } = useVendorPortal()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const summary = useMemo(() => getVendorEarningsSummary(jobs), [jobs])

  const rows = useMemo(() => {
    return jobs
      .map((job) => ({
        job,
        visibility: getBookingPayoutVisibility(job.payment, job.jobStatus),
      }))
      .filter(({ visibility }) => visibility.status !== "none")
      .sort((a, b) => b.job.eventDate.localeCompare(a.job.eventDate))
  }, [jobs])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows
    return rows.filter(({ visibility }) => visibility.status === statusFilter)
  }, [rows, statusFilter])

  return (
    <PageTransition>
      <header className={embedded ? "mb-6" : "mb-8"}>
        <h1 className="shaadi-page-title">Earnings</h1>
        <p className="mt-1 text-maroon/60">
          What you&apos;re owed, what&apos;s held, and what&apos;s already paid
        </p>
      </header>

      <SafepayVisibilityBanner bankPayoutsActive={summary.bankPayoutsActive} />

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Owed"
          value={formatPrice(summary.owedPkr)}
          subtext="Confirmed — not paid out to your bank yet"
        />
        <StatCard
          label="Pending"
          value={formatPrice(summary.pendingPkr)}
          subtext="Held for check-in, dispute, or payout processing"
        />
        <StatCard
          label="Paid"
          value={formatPrice(summary.paidPkr)}
          subtext={
            summary.bankPayoutsActive
              ? "Bank payouts settled + in-person balances"
              : "In-person balances only until Safepay is live"
          }
        />
      </section>

      {summary.paidBreakdown.length > 0 ? (
        <section className="mb-8" aria-labelledby="paid-breakdown-heading">
          <h2 id="paid-breakdown-heading" className="shaadi-section-title sm:text-xl">
            Paid breakdown
          </h2>
          <ul className="shaadi-card mt-4 divide-y divide-gold/15 overflow-hidden">
            {summary.paidBreakdown.map((row) => (
              <li key={`${row.jobId}-${row.note}-${row.paidAtLabel}`}>
                <Link
                  href={`/vendor/jobs/${row.jobId}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-ivory/60 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-maroon-dark">
                      {row.familyName}
                      {row.weddingName ? ` · ${row.weddingName}` : ""}
                    </p>
                    <p className="text-sm text-maroon/50">
                      {row.eventName} ·{" "}
                      {new Date(`${row.eventDate}T12:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" · "}
                      {row.note}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="shaadi-stat-value text-lg">{formatPrice(row.amountPkr)}</p>
                    <p className="text-xs text-maroon/45">{row.paidAtLabel}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="per-booking-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="per-booking-heading" className="shaadi-section-title sm:text-xl">
            Per booking
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by payout status">
            {(
              [
                ["all", "All"],
                ["owed", "Owed"],
                ["pending", "Pending"],
                ["paid", "Paid"],
                ["on_hold", "On hold"],
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
            {jobs.length === 0
              ? "No confirmed bookings yet — earnings appear once families book you."
              : "No bookings match this filter."}
          </div>
        ) : (
          <ul className="shaadi-card divide-y divide-gold/15 overflow-hidden">
            {filtered.map(({ job, visibility }) => (
              <BookingEarningsRow key={job.id} job={job} visibility={visibility} />
            ))}
          </ul>
        )}
      </section>
    </PageTransition>
  )
}

function SafepayVisibilityBanner({ bankPayoutsActive }: { bankPayoutsActive: boolean }) {
  if (bankPayoutsActive) {
    return (
      <p
        className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950"
        role="status"
      >
        Some bank payouts have settled. Owed and Pending still mean money has not
        finished transferring to your account.
      </p>
    )
  }

  return (
    <p
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <span className="font-semibold">Visibility only — bank payouts are not active yet.</span>{" "}
      Owed and Pending amounts show what you will receive once Safepay payouts are
      connected. Nothing here means money has already been sent to your bank.
    </p>
  )
}

function BookingEarningsRow({
  job,
  visibility,
}: {
  job: VendorJob
  visibility: ReturnType<typeof getBookingPayoutVisibility>
}) {
  return (
    <li>
      <Link
        href={`/vendor/jobs/${job.id}`}
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-ivory/60 sm:px-5"
      >
        <div className="min-w-0">
          <p className="font-medium text-maroon-dark">{job.familyName}</p>
          <p className="text-sm text-maroon/50">
            {job.eventName} ·{" "}
            {new Date(`${job.eventDate}T12:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 max-w-md text-xs text-maroon/45">{visibility.detail}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${visibility.style}`}
          >
            {visibility.label}
          </span>
          <span className="shaadi-stat-value text-lg">
            {formatPrice(visibility.amountPkr || job.payment.depositAmount)}
          </span>
        </div>
      </Link>
    </li>
  )
}

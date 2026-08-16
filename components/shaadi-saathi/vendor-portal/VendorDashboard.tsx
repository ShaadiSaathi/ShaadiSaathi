"use client"

import Link from "next/link"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import StatCard from "@/components/shaadi-saathi/app/StatCard"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { JobStatusBadge } from "@/components/shaadi-saathi/vendor-portal/JobStatusBadge"
import VendorBookingCalendar from "@/components/shaadi-saathi/vendor-portal/VendorBookingCalendar"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import VendorReviewsSection from "@/components/shaadi-saathi/vendors/VendorReviewsSection"
import { formatEventDate } from "@/lib/mockData"
import { formatPrice } from "@/lib/mockVendors"
import {
  getCurrentMonthKey,
  getMonthlyEarnings,
  isNewVendor,
} from "@/lib/mockVendorPortal"
import { getVendorEarningsSummary } from "@/lib/vendor-earnings"
import {
  normalizeVendorOnboardingStatus,
  vendorNeedsOnboarding,
  vendorOnboardingIsPending,
} from "@/lib/firebase/vendor-onboarding"

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function daysUntilDate(dateIso: string, from = new Date()): number {
  const target = new Date(`${dateIso}T12:00:00`)
  const start = new Date(from)
  start.setHours(12, 0, 0, 0)
  return Math.max(0, Math.ceil((target.getTime() - start.getTime()) / 86_400_000))
}

/** Vendor dashboard — parity with family home: attention, upcoming, earnings, KYC. */
export default function VendorDashboard() {
  const router = useRouter()
  const { business, requests, jobs } = useVendorPortal()
  const { vendorTier, nextBillingDate } = usePremium()
  const isFeatured = vendorTier === "featured"

  const onboardingStatus = normalizeVendorOnboardingStatus(
    business.onboardingStatus,
    business.verificationStatus
  )
  const needsOnboarding = vendorNeedsOnboarding(business.onboardingStatus)
  const isPendingReview = vendorOnboardingIsPending(
    business.onboardingStatus,
    business.verificationStatus
  )
  const isRejected = onboardingStatus === "rejected"
  const isUnverified =
    !isPendingReview &&
    !isRejected &&
    (business.verificationStatus === "unverified" ||
      business.verificationStatus == null)

  useEffect(() => {
    if (needsOnboarding) {
      router.replace("/vendor/onboarding")
    }
  }, [needsOnboarding, router])

  const monthKey = getCurrentMonthKey()
  const today = todayKey()

  const attentionRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === "pending" ||
          r.status === "awaiting_vendor_response"
      ),
    [requests]
  )

  const openDisputes = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.jobStatus === "disputed" &&
          !j.disputeVendorResponse?.trim()
      ),
    [jobs]
  )

  const upcomingJobs = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.jobStatus === "upcoming" || j.jobStatus === "awaiting_check_in"
        )
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [jobs]
  )

  const nextJob = upcomingJobs[0]
  const nextJobs = upcomingJobs.slice(0, 4)
  const upcomingThisMonth = upcomingJobs.filter((j) =>
    j.eventDate.startsWith(monthKey)
  ).length
  const monthlyEarnings = getMonthlyEarnings(jobs, monthKey)
  const earningsSummary = useMemo(() => getVendorEarningsSummary(jobs), [jobs])
  const attentionCount = attentionRequests.length + openDisputes.length
  const hasAnyActivity = jobs.length > 0 || requests.length > 0
  const daysUntilNext = nextJob ? daysUntilDate(nextJob.eventDate) : null
  const isToday = nextJob?.eventDate === today

  if (needsOnboarding) {
    return (
      <PageTransition>
        <p className="text-sm text-maroon/60">Redirecting to onboarding…</p>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <header className="mb-8 md:mb-10">
        <p className="shaadi-label">Good morning</p>
        <h1 className="shaadi-page-title mt-1">
          Welcome back, {business.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm leading-relaxed text-maroon/65">
          {business.categoryLabel} · {business.city}
          {isFeatured && <FeaturedBadge />}
        </p>

        {nextJob ? (
          <>
            <div className="mt-5 rounded-[1.25rem] bg-gold/15 px-5 py-6 md:hidden">
              <p className="shaadi-label">
                {isToday ? "Today" : "Next booking"}
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold text-maroon-dark">
                    {nextJob.familyName}
                  </p>
                  <p className="mt-1 text-sm text-maroon/55">
                    {nextJob.eventName} · {formatEventDate(nextJob.eventDate)}
                  </p>
                </div>
                {daysUntilNext != null && !isToday ? (
                  <p className="shrink-0 text-right">
                    <span className="shaadi-stat-value block">{daysUntilNext}</span>
                    <span className="text-xs font-medium text-maroon/45">
                      days left
                    </span>
                  </p>
                ) : (
                  <p className="shrink-0 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-gold">
                    Today
                  </p>
                )}
              </div>
              <Link
                href={`/vendor/jobs/${nextJob.id}`}
                className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
              >
                Open job →
              </Link>
            </div>

            <div className="mt-4 hidden flex-wrap items-center gap-3 md:flex">
              <p className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-5 py-2 text-sm font-medium text-maroon-dark">
                <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                {isToday
                  ? `Today: ${nextJob.eventName} · ${nextJob.familyName}`
                  : `${daysUntilNext} days until ${nextJob.eventName} · ${nextJob.familyName}`}
              </p>
              <Link
                href={`/vendor/jobs/${nextJob.id}`}
                className="text-sm font-semibold text-maroon hover:text-gold-dark"
              >
                View job →
              </Link>
            </div>
          </>
        ) : null}
      </header>

      {/* Quick status — KYC / onboarding */}
      {isPendingReview ? (
        <section
          aria-labelledby="pending-review-heading"
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
        >
          <h2
            id="pending-review-heading"
            className="font-display text-lg font-semibold text-amber-950"
          >
            Pending review
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
            Your listing is with our team. You can still edit your business info,
            portfolio, and services while you wait.
            {business.verificationSubmittedAt
              ? ` Submitted ${new Date(business.verificationSubmittedAt).toLocaleString()}.`
              : null}
          </p>
          <Link
            href="/vendor/onboarding"
            className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-950 underline-offset-2 hover:underline"
          >
            View or edit submission →
          </Link>
        </section>
      ) : null}

      {isRejected ? (
        <section
          aria-labelledby="rejected-review-heading"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5"
        >
          <h2
            id="rejected-review-heading"
            className="font-display text-lg font-semibold text-rose-950"
          >
            Submission not approved
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
            {business.verificationRejectionReason ||
              "Please update your details and resubmit for review."}
          </p>
          <Link
            href="/vendor/onboarding"
            className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-rose-950 underline-offset-2 hover:underline"
          >
            Fix and resubmit →
          </Link>
        </section>
      ) : null}

      {isUnverified ? (
        <section
          aria-labelledby="unverified-heading"
          className="mb-6 rounded-2xl border border-gold/30 bg-white p-5"
        >
          <h2
            id="unverified-heading"
            className="font-display text-lg font-semibold text-maroon-dark"
          >
            Finish payment verification
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-maroon/70">
            You can receive booking requests now. Deposits and payouts unlock
            after admin approval.
          </p>
          <Link
            href="/vendor/profile"
            className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
          >
            Complete verification →
          </Link>
        </section>
      ) : null}

      {/* Needs attention */}
      <section aria-labelledby="needs-attention-heading" className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="needs-attention-heading"
            className="shaadi-section-title sm:text-xl"
          >
            Needs attention
          </h2>
          {attentionCount > 0 ? (
            <span className="rounded-full bg-maroon px-2.5 py-0.5 text-xs font-bold text-gold">
              {attentionCount}
            </span>
          ) : null}
        </div>

        {attentionCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-white/50 px-5 py-6 text-center">
            <p className="text-sm text-maroon/60">
              You’re all caught up — no pending requests or open disputes.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {attentionRequests.map((req) => (
              <li key={req.id}>
                <Link
                  href="/vendor/requests"
                  className="shaadi-card flex min-h-[44px] flex-col gap-2 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Booking request
                    </p>
                    <p className="mt-1 font-semibold text-maroon-dark">
                      {req.familyName}
                    </p>
                    <p className="text-sm text-maroon/60">
                      {req.eventName} · {formatEventDate(req.eventDate)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-maroon">
                    Respond →
                  </span>
                </Link>
              </li>
            ))}
            {openDisputes.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/vendor/jobs/${job.id}`}
                  className="shaadi-card flex min-h-[44px] flex-col gap-2 border-rose-200/80 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
                      Open dispute
                    </p>
                    <p className="mt-1 font-semibold text-maroon-dark">
                      {job.familyName}
                    </p>
                    <p className="text-sm text-maroon/60">
                      {job.eventName} · {formatEventDate(job.eventDate)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-800">
                    Respond →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Overview stats */}
      <section aria-labelledby="vendor-overview" className="mb-8 md:mb-10">
        <h2 id="vendor-overview" className="sr-only">
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Upcoming this month"
            value={upcomingThisMonth}
            subtext="Confirmed bookings"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
          />
          <StatCard
            label="Needs attention"
            value={attentionCount}
            subtext="Requests & disputes"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            }
          />
          <StatCard
            label="This month"
            value={formatPrice(monthlyEarnings)}
            subtext="Confirmed & completed"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.375M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
          />
          <StatCard
            label={isNewVendor(business.completedJobsCount) ? "Status" : "Reliability"}
            value={
              isNewVendor(business.completedJobsCount)
                ? "New vendor"
                : `${business.reliabilityScore}%`
            }
            subtext={
              isNewVendor(business.completedJobsCount)
                ? "Building track record"
                : `${business.rating}★ · ${business.onTimeCheckInRate}% on-time`
            }
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Subscription — compact, secondary */}
      <section
        aria-labelledby="subscription-heading"
        className="mb-8 shaadi-card p-5"
      >
        <h2 id="subscription-heading" className="sr-only">
          Subscription status
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="shaadi-label">Your plan</p>
            <p className="mt-1 text-base font-semibold text-maroon-dark">
              {isFeatured ? "Featured" : "Basic (Free)"}
            </p>
            {isFeatured && nextBillingDate ? (
              <p className="mt-1 text-xs text-maroon/50">
                Next billing: {nextBillingDate}
              </p>
            ) : null}
          </div>
          <Link
            href={isFeatured ? "/vendor/subscription" : "/vendor/upgrade"}
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-gold-dark hover:underline"
          >
            {isFeatured ? "Manage subscription" : "Upgrade to Featured →"}
          </Link>
        </div>
      </section>

      {/* Payout visibility — amounts only; Safepay bank transfers not live */}
      <section className="mb-8 md:mb-10" aria-labelledby="vendor-earnings-visibility">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="vendor-earnings-visibility" className="shaadi-section-title sm:text-xl">
              Earnings overview
            </h2>
            <p className="mt-1 text-sm text-maroon/55">
              Tracked from your bookings — not a bank transfer yet
            </p>
          </div>
          <Link
            href="/vendor/jobs?tab=earnings"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
          >
            Full earnings →
          </Link>
        </div>

        {!earningsSummary.bankPayoutsActive ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <span className="font-semibold">Safepay payouts are not active yet.</span>{" "}
            Owed and Pending show what you will receive once bank payouts go live —
            these totals do not mean money has been sent.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Owed"
            value={formatPrice(earningsSummary.owedPkr)}
            subtext="Ready for payout when Safepay is live"
          />
          <StatCard
            label="Pending"
            value={formatPrice(earningsSummary.pendingPkr)}
            subtext="Held for check-in or dispute window"
          />
          <StatCard
            label="Paid"
            value={formatPrice(earningsSummary.paidPkr)}
            subtext={
              earningsSummary.bankPayoutsActive
                ? "Settled payouts & in-person balances"
                : "In-person balances received on the day"
            }
          />
        </div>

        {earningsSummary.paidBreakdown.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {earningsSummary.paidBreakdown.slice(0, 3).map((row) => (
              <li key={`${row.jobId}-${row.note}`}>
                <Link
                  href={`/vendor/jobs/${row.jobId}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-gold/20 bg-white px-4 py-3 text-sm transition-shadow hover:shadow-sm"
                >
                  <span className="min-w-0 truncate text-maroon/70">
                    <span className="font-semibold text-maroon-dark">{row.familyName}</span>
                    {" · "}
                    {row.eventName}
                    {" · "}
                    {row.note}
                  </span>
                  <span className="shrink-0 font-semibold text-maroon-dark">
                    {formatPrice(row.amountPkr)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Reviews from families */}
      <section className="mb-8 md:mb-10" aria-label="Your reviews">
        <VendorReviewsSection
          vendorId={business.id}
          rating={business.rating}
          reviewCount={business.reviewCount}
          allowVendorReply
          heading="Your reviews"
          emptyTitle="No reviews yet"
        />
      </section>

      {/* Today / upcoming */}
      <section aria-labelledby="upcoming-jobs">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upcoming-jobs" className="shaadi-section-title sm:text-xl">
            Today & upcoming
          </h2>
          <Link
            href="/vendor/jobs"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
          >
            View all →
          </Link>
        </div>

        {!hasAnyActivity ? (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-white/50 p-8 text-center">
            <p className="font-display text-lg font-semibold text-maroon-dark">
              No bookings yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-maroon/60">
              When families request you, they’ll show up under Needs attention.
              Keep your profile and portfolio up to date so you’re easy to find.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/vendor/profile"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
              >
                Update profile →
              </Link>
              <Link
                href="/vendor/requests"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
              >
                Check requests →
              </Link>
            </div>
          </div>
        ) : nextJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-white/50 p-8 text-center">
            <p className="text-maroon/60">
              No upcoming confirmed jobs. Accept a booking request to get started.
            </p>
            <Link
              href="/vendor/requests"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
            >
              Check requests →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {nextJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/vendor/jobs/${job.id}`}
                  className="shaadi-card flex min-h-[44px] flex-col gap-3 p-4 transition-shadow hover:shadow-md md:flex-row md:flex-wrap md:items-center md:justify-between md:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-maroon-dark">
                        {job.familyName}
                      </p>
                      {job.eventDate === today ? (
                        <span className="rounded-full bg-maroon/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon">
                          Today
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-maroon/60">
                      {job.eventName} · {formatEventDate(job.eventDate)}
                      {job.eventTime ? ` · ${job.eventTime}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <JobStatusBadge status={job.jobStatus} />
                    <span className="text-sm font-semibold text-maroon-dark">
                      {formatPrice(job.price)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Month calendar — confirmed + pending */}
      <section className="mt-8 md:mt-10" aria-label="Booking calendar">
        <VendorBookingCalendar jobs={jobs} requests={requests} compact />
        <p className="mt-2 text-right">
          <Link
            href="/vendor/jobs?view=calendar"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon hover:text-gold-dark"
          >
            Open full calendar →
          </Link>
        </p>
      </section>

      {/* Quick links — match family pill CTAs */}
      <section className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/vendor/requests"
          className="flex min-h-[48px] items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-maroon shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md"
        >
          Booking requests →
        </Link>
        <Link
          href="/vendor/jobs"
          className="flex min-h-[48px] items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-maroon shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md"
        >
          My jobs →
        </Link>
        <Link
          href="/vendor/earnings"
          className="flex min-h-[48px] items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-maroon shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md"
        >
          Earnings →
        </Link>
        <Link
          href="/vendor/profile"
          className="flex min-h-[48px] items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-maroon shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md"
        >
          Profile →
        </Link>
      </section>
    </PageTransition>
  )
}

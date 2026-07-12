"use client"

import Link from "next/link"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import StatCard from "@/components/shaadi-saathi/app/StatCard"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { JobStatusBadge } from "@/components/shaadi-saathi/vendor-portal/JobStatusBadge"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { formatEventDate } from "@/lib/mockData"
import { formatPrice } from "@/lib/mockVendors"
import { getMonthlyEarnings, isNewVendor } from "@/lib/mockVendorPortal"

/** Vendor dashboard — overview, upcoming jobs, pending requests prompt */
export default function VendorDashboard() {
  const { business, requests, jobs } = useVendorPortal()
  const { vendorTier, nextBillingDate } = usePremium()
  const isFeatured = vendorTier === "featured"

  const pendingCount = requests.length
  const upcomingJobs = jobs
    .filter((j) => j.jobStatus === "upcoming" || j.jobStatus === "awaiting_check_in")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const upcomingThisMonth = upcomingJobs.filter((j) => j.eventDate.startsWith("2026-08")).length
  const monthlyEarnings = getMonthlyEarnings(jobs)
  const nextJobs = upcomingJobs.slice(0, 3)

  return (
    <PageTransition>
      <header className="mb-8">
        <p className="text-sm font-medium text-maroon/60">Good morning</p>
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
          Welcome back, {business.name}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-maroon/70">
          {business.categoryLabel} · {business.city}
          {isFeatured && <FeaturedBadge />}
        </p>
      </header>

      {/* Subscription status */}
      <section
        aria-labelledby="subscription-heading"
        className="mb-6 rounded-2xl border border-gold/25 bg-white p-5 shadow-sm"
      >
        <h2 id="subscription-heading" className="sr-only">
          Subscription status
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-maroon/50">Your plan</p>
            <p className="mt-0.5 font-display text-lg font-semibold text-maroon-dark">
              {isFeatured ? "Featured" : "Basic (Free)"}
            </p>
            {isFeatured && nextBillingDate && (
              <p className="mt-1 text-xs text-maroon/50">
                Next billing: {nextBillingDate}
              </p>
            )}
          </div>
          <Link
            href={isFeatured ? "/vendor/subscription" : "/vendor/upgrade"}
            className="text-sm font-semibold text-gold-dark hover:underline"
          >
            {isFeatured ? "Manage subscription" : "Upgrade to Featured →"}
          </Link>
        </div>
      </section>

      {pendingCount > 0 && (
        <Link
          href="/vendor/requests"
          className="mb-6 flex items-center justify-between rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 to-gold/5 p-4 transition-shadow hover:shadow-md"
        >
          <div>
            <p className="font-semibold text-maroon-dark">
              You have {pendingCount} new booking request{pendingCount > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-maroon/60">Review and respond before they expire</p>
          </div>
          <span className="rounded-full bg-maroon px-3 py-1 text-sm font-bold text-gold">
            {pendingCount}
          </span>
        </Link>
      )}

      <section aria-labelledby="vendor-overview" className="mb-8">
        <h2 id="vendor-overview" className="sr-only">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            label="Pending requests"
            value={pendingCount}
            subtext="Awaiting your response"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488" />
              </svg>
            }
          />
          <StatCard
            label="Earned this month"
            value={formatPrice(monthlyEarnings)}
            subtext="Completed jobs"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.375M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
          />
          <StatCard
            label={isNewVendor(business.completedJobsCount) ? "Status" : "Reliability score"}
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

      <section aria-labelledby="upcoming-jobs">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upcoming-jobs" className="font-display text-xl font-semibold text-maroon-dark">
            Upcoming jobs
          </h2>
          <Link href="/vendor/jobs" className="text-sm font-semibold text-maroon hover:text-gold-dark">
            View all →
          </Link>
        </div>

        {nextJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-white/50 p-8 text-center">
            <p className="text-maroon/60">No upcoming jobs yet. Accept a booking request to get started.</p>
            <Link
              href="/vendor/requests"
              className="mt-3 inline-block text-sm font-semibold text-maroon hover:text-gold-dark"
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-semibold text-maroon-dark">{job.familyName}</p>
                    <p className="text-sm text-maroon/60">
                      {job.eventName} · {formatEventDate(job.eventDate)} · {job.eventTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
    </PageTransition>
  )
}

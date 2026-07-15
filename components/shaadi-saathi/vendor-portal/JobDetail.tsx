"use client"

import Link from "next/link"
import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import DepositBalanceCard from "@/components/shaadi-saathi/vendors/payments/DepositBalanceCard"
import {
  BalanceStatusBadge,
  DepositStatusBadge,
  DisputeBadge,
  PaymentPathBadge,
} from "@/components/shaadi-saathi/vendors/payments/PaymentStatusBadges"
import { JobStatusBadge } from "@/components/shaadi-saathi/vendor-portal/JobStatusBadge"
import CheckInButton, { GracePeriodBanner } from "@/components/shaadi-saathi/vendors/payments/CheckInButton"
import { QualityConcernBadge, QualityConcernCard } from "@/components/shaadi-saathi/shared/QualityConcernForm"
import MessageThread from "@/components/shaadi-saathi/shared/MessageThread"
import { RepeatClientBadge } from "@/components/shaadi-saathi/shared/StatusBadge"
import CheckInPhotoDisplay from "@/components/shaadi-saathi/shared/CheckInPhotoDisplay"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { formatEventDate } from "@/lib/mockData"
import { MOCK_NOW } from "@/lib/mockPayments"
import { formatPrice } from "@/lib/mockVendors"
import type { VendorJob } from "@/lib/mockVendorPortal"

interface JobDetailProps {
  job: VendorJob
}

/** Full job detail — check-in, mark completed, dispute response */
export default function JobDetail({ job }: JobDetailProps) {
  const { vendorCheckIn, markJobCompleted, submitDisputeResponse } = useVendorPortal()
  const [disputeText, setDisputeText] = useState(job.disputeVendorResponse ?? "")
  const [submitted, setSubmitted] = useState(!!job.disputeVendorResponse)

  const payment = job.payment
  const isEventDay =
    job.eventDate === MOCK_NOW.toISOString().slice(0, 10) ||
    job.jobStatus === "awaiting_check_in"
  const isPastEvent = job.eventDate < MOCK_NOW.toISOString().slice(0, 10)
  const canCheckIn =
    !payment.checkInAt &&
    (job.jobStatus === "awaiting_check_in" || job.jobStatus === "upcoming") &&
    (isEventDay || job.jobStatus === "awaiting_check_in")
  const canMarkCompleted =
    job.jobStatus !== "completed" &&
    job.jobStatus !== "disputed" &&
    (payment.checkInAt || isPastEvent)

  const showGrace =
    !payment.checkInAt &&
    payment.gracePeriodEndsAt &&
    job.jobStatus === "awaiting_check_in"

  return (
    <PageTransition>
      <Link
        href="/vendor/jobs"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
      >
        ← Back to My Jobs
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
              {job.familyName}
            </h1>
            <p className="text-maroon/60">{job.weddingName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {job.isRepeatClient && <RepeatClientBadge />}
            <JobStatusBadge status={job.jobStatus} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-maroon-dark">Event details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-maroon/50">Event</dt>
              <dd className="font-medium text-maroon-dark">{job.eventName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-maroon/50">Date & time</dt>
              <dd className="font-medium text-maroon-dark text-right">
                {formatEventDate(job.eventDate)} · {job.eventTime}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-maroon/50">Venue</dt>
              <dd className="font-medium text-maroon-dark text-right">{job.venue}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-maroon/50">Address</dt>
              <dd className="font-medium text-maroon-dark text-right">{job.venueAddress}</dd>
            </div>
            {job.guestCount && (
              <div className="flex justify-between gap-4">
                <dt className="text-maroon/50">Guests</dt>
                <dd className="font-medium text-maroon-dark">{job.guestCount}</dd>
              </div>
            )}
            {job.packageName && (
              <div className="flex justify-between gap-4">
                <dt className="text-maroon/50">Package</dt>
                <dd className="font-medium text-maroon-dark">{job.packageName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-gold/15 pt-3">
              <dt className="text-maroon/50">Total price</dt>
              <dd className="font-display text-xl font-bold text-maroon-dark">
                {formatPrice(job.price)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-gold/25 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-maroon-dark">Family contact</h2>
            <p className="mt-3 text-sm text-maroon/70">{job.familyPhone}</p>
            <Link
              href={`/vendor/jobs/${job.id}/messages`}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-maroon hover:text-gold-dark"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Message family
            </Link>
          </div>

          <div className="rounded-2xl border border-gold/25 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-maroon-dark">Payment</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <DepositStatusBadge status={payment.depositStatus} />
              <BalanceStatusBadge payment={payment} />
              <PaymentPathBadge payment={payment} />
              {payment.qualityConcern && <QualityConcernBadge />}
              {payment.dispute?.status === "under_review" && <DisputeBadge />}
            </div>
            {payment.qualityConcern && (
              <div className="mt-3">
                <QualityConcernCard description={payment.qualityConcern.description} />
              </div>
            )}
            <div className="mt-4">
              <DepositBalanceCard payment={payment} compact />
            </div>
          </div>
        </section>
      </div>

      {(canCheckIn || showGrace) && (
        <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <h2 className="font-display text-lg font-semibold text-maroon-dark">Day-of check-in</h2>
          <p className="mt-1 text-sm text-maroon/60">
            Confirm your arrival to release the held deposit. Either you or the family can trigger
            this.
          </p>
          {showGrace && payment.gracePeriodEndsAt && (
            <div className="mt-4">
              <GracePeriodBanner endsAt={payment.gracePeriodEndsAt} />
            </div>
          )}
          <div className="mt-4">
            <CheckInButton
              variant="vendor"
              onCheckIn={(photo) => vendorCheckIn(job.id, photo)}
              checkedIn={!!payment.checkInAt}
              checkedInAt={payment.checkInAt}
              checkInPhoto={payment.checkInPhoto}
              disabled={!canCheckIn && !payment.checkInAt}
            />
          </div>
          {payment.checkInPhoto && payment.checkInAt && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-maroon/50">
                Check-in proof
              </p>
              <CheckInPhotoDisplay photo={payment.checkInPhoto} />
            </div>
          )}
        </section>
      )}

      {canMarkCompleted && (
        <section className="mt-6 rounded-2xl border border-gold/25 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-maroon-dark">Mark completed</h2>
          <p className="mt-1 text-sm text-maroon/60">
            After the event, mark this job as completed to finalize your earnings record.
          </p>
          <div className="mt-4">
            <GoldButton onClick={() => markJobCompleted(job.id)}>Mark Job Completed</GoldButton>
          </div>
        </section>
      )}

      {job.jobStatus === "disputed" && job.disputeFamilyMessage && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            Family raised an issue — Respond
          </h2>
          <blockquote className="mt-3 rounded-xl bg-white/80 p-4 text-sm text-maroon/80">
            &ldquo;{job.disputeFamilyMessage}&rdquo;
          </blockquote>

          {submitted ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-medium">Your response has been submitted</p>
              <p className="mt-1 text-emerald-700">{disputeText}</p>
            </div>
          ) : (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (!disputeText.trim()) return
                submitDisputeResponse(job.id, disputeText)
                setSubmitted(true)
              }}
            >
              <label htmlFor="dispute-response" className="block text-sm font-medium text-maroon/70">
                Your response
              </label>
              <textarea
                id="dispute-response"
                rows={4}
                value={disputeText}
                onChange={(e) => setDisputeText(e.target.value)}
                placeholder="Explain your side — portion sizes, timing, guest count agreement..."
                className="w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-maroon-dark placeholder:text-maroon/40 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
                required
              />
              <div>
                <label
                  htmlFor="dispute-file"
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gold/40 bg-white px-4 py-2 text-sm text-maroon/60 hover:bg-gold/5"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.106 9.192a2.25 2.25 0 01-3.182 0l-3.11-3.11a2.25 2.25 0 010-3.182l3.11-3.11a2.25 2.25 0 013.182 0l3.11 3.11a2.25 2.25 0 010 3.182z" />
                  </svg>
                  Attach photo (mock)
                  <input id="dispute-file" type="file" className="sr-only" disabled />
                </label>
              </div>
              <GoldButton type="submit">Submit Response</GoldButton>
            </form>
          )}
        </section>
      )}

      {payment.messages && payment.messages.length > 0 && (
        <div className="mt-6">
          <MessageThread messages={payment.messages} />
        </div>
      )}
    </PageTransition>
  )
}

/** Job list card for My Jobs page */
export function JobListCard({ job }: { job: VendorJob }) {
  const payment = job.payment

  return (
    <Link
      href={`/vendor/jobs/${job.id}`}
      className="block rounded-2xl border border-gold/25 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-maroon-dark">{job.familyName}</h3>
          <p className="text-sm text-maroon/60">
            {job.eventName} · {formatEventDate(job.eventDate)} · {job.venue}
          </p>
        </div>
        <span className="font-display text-lg font-bold text-maroon-dark">
          {formatPrice(job.price)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.isRepeatClient && <RepeatClientBadge />}
        <JobStatusBadge status={job.jobStatus} />
        <DepositStatusBadge status={payment.depositStatus} />
        <BalanceStatusBadge payment={payment} />
      </div>
    </Link>
  )
}

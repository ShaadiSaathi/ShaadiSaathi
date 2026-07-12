"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EarningsList from "@/components/shaadi-saathi/vendor-portal/EarningsList"
import { JobListCard } from "@/components/shaadi-saathi/vendor-portal/JobDetail"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import type { VendorJob } from "@/lib/mockVendorPortal"

type MainTab = "jobs" | "earnings"
type JobTab = "upcoming" | "completed"
type ViewMode = "list" | "calendar"

export default function VendorJobsPageClient() {
  const searchParams = useSearchParams()
  const { jobs } = useVendorPortal()
  const [mainTab, setMainTab] = useState<MainTab>("jobs")
  const [view, setView] = useState<ViewMode>("list")
  const [jobTab, setJobTab] = useState<JobTab>("upcoming")

  useEffect(() => {
    if (searchParams.get("tab") === "earnings") setMainTab("earnings")
  }, [searchParams])

  const upcoming = jobs.filter(
    (j) => j.jobStatus !== "completed" && j.jobStatus !== "no_show_flagged"
  )
  const completed = jobs.filter(
    (j) => j.jobStatus === "completed" || j.jobStatus === "no_show_flagged"
  )
  const displayed = jobTab === "upcoming" ? upcoming : completed

  if (mainTab === "earnings") {
    return (
      <PageTransition>
        <div className="mb-6 flex w-fit rounded-full border border-gold/25 bg-white p-1">
          <MainTabButton active={false} onClick={() => setMainTab("jobs")} label="Jobs" />
          <MainTabButton active label="Earnings" onClick={() => setMainTab("earnings")} />
        </div>
        <EarningsList embedded />
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="mb-6 flex w-fit rounded-full border border-gold/25 bg-white p-1">
        <MainTabButton active label="Jobs" onClick={() => setMainTab("jobs")} />
        <MainTabButton active={false} onClick={() => setMainTab("earnings")} label="Earnings" />
      </div>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">My Jobs</h1>
        <p className="mt-1 text-maroon/60">Confirmed bookings across all families</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-gold/25 bg-white p-1" role="tablist">
          {(["upcoming", "completed"] as JobTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={jobTab === t}
              onClick={() => setJobTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                jobTab === t ? "bg-maroon text-ivory" : "text-maroon/60 hover:text-maroon"
              }`}
            >
              {t} ({t === "upcoming" ? upcoming.length : completed.length})
            </button>
          ))}
        </div>

        <div className="flex rounded-full border border-gold/25 bg-white p-1">
          {(["list", "calendar"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                view === v ? "bg-gold/20 text-maroon-dark" : "text-maroon/50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 p-8 text-center text-maroon/60">
          {jobTab === "upcoming"
            ? "No upcoming jobs. Accept a booking request to add one."
            : "No completed jobs yet."}
        </div>
      ) : view === "list" ? (
        <ul className="space-y-4">
          {displayed.map((job) => (
            <li key={job.id}>
              <JobListCard job={job} />
            </li>
          ))}
        </ul>
      ) : (
        <CalendarView jobs={displayed} />
      )}
    </PageTransition>
  )
}

function MainTabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-maroon text-ivory" : "text-maroon/60 hover:text-maroon"
      }`}
    >
      {label}
    </button>
  )
}

function CalendarView({ jobs }: { jobs: VendorJob[] }) {
  const byMonth = jobs.reduce<Record<string, VendorJob[]>>((acc, job) => {
    const month = job.eventDate.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(job)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, monthJobs]) => (
          <section key={month} className="rounded-2xl border border-gold/25 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-maroon-dark">
              {new Date(`${month}-01`).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <ul className="mt-4 space-y-2">
              {monthJobs
                .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
                .map((job) => (
                  <li key={job.id}>
                    <JobListCard job={job} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

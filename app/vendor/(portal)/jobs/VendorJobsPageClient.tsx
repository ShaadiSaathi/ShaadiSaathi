"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import EarningsList from "@/components/shaadi-saathi/vendor-portal/EarningsList"
import { JobListCard } from "@/components/shaadi-saathi/vendor-portal/JobDetail"
import VendorBookingCalendar from "@/components/shaadi-saathi/vendor-portal/VendorBookingCalendar"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"

type MainTab = "jobs" | "earnings"
type JobTab = "upcoming" | "completed"
type ViewMode = "list" | "calendar"

export default function VendorJobsPageClient() {
  const searchParams = useSearchParams()
  const { jobs, requests } = useVendorPortal()
  const [mainTab, setMainTab] = useState<MainTab>("jobs")
  const [view, setView] = useState<ViewMode>("list")
  const [jobTab, setJobTab] = useState<JobTab>("upcoming")

  useEffect(() => {
    if (searchParams.get("tab") === "earnings") setMainTab("earnings")
    if (searchParams.get("view") === "calendar") setView("calendar")
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
        <h1 className="shaadi-page-title">My Jobs</h1>
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

      {view === "calendar" ? (
        <VendorBookingCalendar
          jobs={jobTab === "upcoming" ? upcoming : jobs}
          requests={jobTab === "upcoming" ? requests : []}
        />
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 p-8 text-center text-maroon/60">
          {jobTab === "upcoming"
            ? "No upcoming jobs. Accept a booking request to add one."
            : "No completed jobs yet."}
        </div>
      ) : (
        <ul className="space-y-4">
          {displayed.map((job) => (
            <li key={job.id}>
              <JobListCard job={job} />
            </li>
          ))}
        </ul>
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

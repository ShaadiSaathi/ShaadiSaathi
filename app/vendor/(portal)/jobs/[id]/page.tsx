"use client"

import { use } from "react"
import JobDetail from "@/components/shaadi-saathi/vendor-portal/JobDetail"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import Link from "next/link"

export default function VendorJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { jobs, jobsLoading } = useVendorPortal()
  const job = jobs.find((j) => j.id === id)

  if (jobsLoading) {
    return <p className="py-12 text-center text-maroon/60">Loading job…</p>
  }

  if (!job) {
    return (
      <div className="py-12 text-center">
        <p className="text-maroon/60">Job not found.</p>
        <Link href="/vendor/jobs" className="mt-4 inline-block text-sm font-semibold text-maroon">
          ← Back to My Jobs
        </Link>
      </div>
    )
  }

  return <JobDetail job={job} />
}

import type { VendorJobStatus } from "@/lib/mockVendorPortal"

const JOB_STATUS_STYLES: Record<VendorJobStatus, string> = {
  upcoming: "border-emerald-200 bg-emerald-50 text-emerald-800",
  awaiting_check_in: "border-amber-200 bg-amber-50 text-amber-900",
  completed: "border-slate-200 bg-slate-50 text-slate-700",
  no_show_flagged: "border-rose-200 bg-rose-50 text-rose-800",
  disputed: "border-amber-200 bg-amber-50 text-amber-900",
}

const JOB_STATUS_LABELS: Record<VendorJobStatus, string> = {
  upcoming: "Upcoming",
  awaiting_check_in: "Awaiting check-in",
  completed: "Completed",
  no_show_flagged: "No-show flagged",
  disputed: "Disputed",
}

export function JobStatusBadge({ status }: { status: VendorJobStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${JOB_STATUS_STYLES[status]}`}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  )
}

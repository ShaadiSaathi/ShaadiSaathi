import type { RsvpStatus } from "@/lib/mockData"

interface RsvpBadgeProps {
  status: RsvpStatus | null
  showLabel?: boolean
}

const config: Record<
  RsvpStatus,
  { label: string; dot: string; badge: string }
> = {
  confirmed: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  declined: {
    label: "Declined",
    dot: "bg-rose-400",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
}

export default function RsvpBadge({ status, showLabel = false }: RsvpBadgeProps) {
  if (!status) return <span className="text-xs text-maroon/30">—</span>

  const { label, dot, badge } = config[status]

  if (showLabel) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-label={label} />
    </span>
  )
}

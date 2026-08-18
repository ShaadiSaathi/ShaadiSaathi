import type { RsvpStatus } from "@/lib/mockData"
import Badge, { type BadgeTone } from "@/components/shaadi-saathi/ui/Badge"

interface RsvpBadgeProps {
  status: RsvpStatus | null
  showLabel?: boolean
}

const config: Record<RsvpStatus, { label: string; tone: BadgeTone; dot: string }> = {
  confirmed: { label: "Confirmed", tone: "success", dot: "bg-emerald-500" },
  pending: { label: "Pending", tone: "warning", dot: "bg-amber-400" },
  declined: { label: "Declined", tone: "danger", dot: "bg-rose-400" },
  cancelled: { label: "Cancelled", tone: "muted", dot: "bg-slate-400" },
}

export default function RsvpBadge({ status, showLabel = false }: RsvpBadgeProps) {
  if (!status) return <span className="text-xs text-maroon/30">—</span>

  const { label, tone, dot } = config[status]

  if (showLabel) {
    return (
      <Badge tone={tone} dot>
        {label}
      </Badge>
    )
  }

  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-label={label} />
    </span>
  )
}

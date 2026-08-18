import type { ReactNode } from "react"
import Card from "@/components/shaadi-saathi/ui/Card"

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
}

/** Monarch-style summary card: muted label, dominant number, soft shadow. */
export default function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-3">
        <p className="shaadi-label">{label}</p>
        {icon ? (
          <div className="shrink-0 text-gold-dark/55 [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
        ) : null}
      </div>
      <p className="shaadi-stat-value mt-3">{value}</p>
      {subtext ? (
        <p className="mt-2 text-xs leading-relaxed text-maroon/40">{subtext}</p>
      ) : null}
    </Card>
  )
}

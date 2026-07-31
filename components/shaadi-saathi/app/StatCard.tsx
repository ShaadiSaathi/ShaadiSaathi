import type { ReactNode } from "react"

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
}

/** Monarch-style summary card: muted label, dominant number, soft shadow (via shaadi-card). */
export default function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div className="shaadi-card px-5 py-6 sm:px-6 sm:py-7">
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
    </div>
  )
}

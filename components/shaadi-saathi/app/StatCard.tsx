import type { ReactNode } from "react"

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
}

export default function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div className="shaadi-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="shaadi-label">{label}</p>
          <p className="shaadi-stat-value mt-2">{value}</p>
          {subtext && (
            <p className="mt-1.5 text-xs leading-relaxed text-maroon/45">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 rounded-xl bg-gold/8 p-2.5 text-gold-dark">{icon}</div>
        )}
      </div>
    </div>
  )
}

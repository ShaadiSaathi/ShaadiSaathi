import type { ReactNode } from "react"

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
}

export default function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-maroon/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-maroon/60">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-maroon-dark">{value}</p>
          {subtext && <p className="mt-1 text-xs text-maroon/50">{subtext}</p>}
        </div>
        {icon && (
          <div className="rounded-xl bg-gold/10 p-2.5 text-gold-dark">{icon}</div>
        )}
      </div>
    </div>
  )
}

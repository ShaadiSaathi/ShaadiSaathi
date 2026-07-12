import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

/** Warm on-brand empty state for lists */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gold/30 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-maroon/5 p-4 text-maroon/60">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-maroon-dark">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-maroon/60">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

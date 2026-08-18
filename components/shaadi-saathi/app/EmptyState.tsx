import type { ReactNode } from "react"
import Card from "@/components/shaadi-saathi/ui/Card"

interface EmptyStateProps {
  illustration?: ReactNode
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

/** Warm on-brand empty state for lists — illustration + copy + CTA. */
export default function EmptyState({
  illustration,
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card variant="dashed" className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {illustration ? (
        <div className="mb-5">{illustration}</div>
      ) : icon ? (
        <div className="mb-4 rounded-2xl bg-maroon/5 p-4 text-maroon/60">{icon}</div>
      ) : null}
      <h3 className="shaadi-section-title">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-maroon/60">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  )
}

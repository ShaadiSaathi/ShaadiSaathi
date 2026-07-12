import type { ReactNode } from "react"

interface StatusBadgeProps {
  label: string
  className: string
}

/** Shared status pill — used across family and vendor portals */
export default function StatusBadge({ label, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  )
}

export function NewVendorBadge() {
  return (
    <StatusBadge
      label="New to Shaadi Saathi"
      className="border-slate-200 bg-slate-50 text-slate-600 normal-case tracking-normal"
    />
  )
}

export function RepeatClientBadge() {
  return (
    <StatusBadge
      label="Repeat client"
      className="border-gold/30 bg-gold/10 text-maroon/80 normal-case tracking-normal"
    />
  )
}

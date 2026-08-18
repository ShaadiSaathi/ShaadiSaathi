import type { ReactNode } from "react"
import { cn } from "@/lib/design/cn"

export type BadgeTone = "gold" | "maroon" | "success" | "warning" | "danger" | "muted"

export interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  size?: "sm" | "md"
  className?: string
  dot?: boolean
}

const TONE_CLASS: Record<BadgeTone, string> = {
  gold: "border-gold/25 bg-gold/15 text-gold-dark",
  maroon: "border-maroon/15 bg-maroon/8 text-maroon",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  muted: "border-slate-200 bg-slate-100 text-slate-600",
}

const DOT_CLASS: Record<BadgeTone, string> = {
  gold: "bg-gold",
  maroon: "bg-maroon",
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  muted: "bg-slate-400",
}

/** Status / category chip used across interior app pages. */
export default function Badge({
  children,
  tone = "gold",
  size = "sm",
  className,
  dot = false,
}: BadgeProps) {
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-sm"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        TONE_CLASS[tone],
        sizeClass,
        className
      )}
    >
      {dot ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone])} aria-hidden="true" />
      ) : null}
      {children}
    </span>
  )
}

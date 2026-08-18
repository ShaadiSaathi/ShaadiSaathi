import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/design/cn"

export type CardVariant = "default" | "interactive" | "dashed"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: CardVariant
  padding?: "none" | "sm" | "md" | "lg"
}

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: "shaadi-card",
  interactive: "shaadi-card shaadi-card-interactive",
  dashed: "shaadi-card border border-dashed border-gold/25 bg-white/60",
}

const PADDING_CLASS = {
  none: "",
  sm: "p-4 md:p-5",
  md: "p-5 md:p-6",
  lg: "px-5 py-6 sm:px-6 sm:py-7",
} as const

/** Shared surface — shadow and radius come from `.shaadi-card`. */
export default function Card({
  children,
  variant = "default",
  padding = "none",
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(VARIANT_CLASS[variant], PADDING_CLASS[padding], className)}
      {...rest}
    >
      {children}
    </div>
  )
}

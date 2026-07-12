"use client"

import { getTier, getTierColor, type Tier } from "@/utils/tier"

type TierBadgeProps = {
  score: number
  tier?: Tier
  size?: "sm" | "md" | "lg"
}

export function TierBadge({ score, tier, size = "md" }: TierBadgeProps) {
  const t = tier ?? getTier(score)
  const color = getTierColor(t)

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-wide ${sizeClasses[size]}`}
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      {t}
    </span>
  )
}

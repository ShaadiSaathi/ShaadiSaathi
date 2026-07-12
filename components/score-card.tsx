"use client"

import { getTier } from "@/utils/tier"
import { TierBadge } from "./tier-badge"

type ScoreCardProps = {
  score: number
  className?: string
}

export function ScoreCard({ score, className = "" }: ScoreCardProps) {
  const tier = getTier(score)

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border p-8 text-center glow-accent ${className}`}
      style={{
        background: "linear-gradient(135deg, #12121A 0%, #1a1020 50%, #12121A 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(233,69,96,0.4) 0%, transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="flex items-baseline justify-center gap-1">
          <span
            className="text-7xl sm:text-8xl font-bold tabular-nums tracking-tight"
            style={{ color: "#E94560" }}
          >
            {score}
          </span>
          <span className="text-2xl text-text-secondary font-medium">/100</span>
        </div>
        <div className="mt-4 flex justify-center">
          <TierBadge score={score} tier={tier} size="lg" />
        </div>
      </div>
    </div>
  )
}

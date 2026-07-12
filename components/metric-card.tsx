"use client"

import type { BreakdownItem } from "@/lib/face-analysis"
import { getScoreColor } from "@/utils/tier"
import { ProgressBar } from "./progress-bar"

type MetricCardProps = {
  metric: BreakdownItem
}

export function MetricCard({ metric }: MetricCardProps) {
  const { label, score, measured, ideal, tip, confidence, unreliable } = metric
  const color = unreliable ? "#555566" : getScoreColor(score)

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/20 ${
        unreliable ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-text-primary">{label}</span>
        <span
          className="font-bold tabular-nums text-lg"
          style={{ color: unreliable ? "#555566" : color }}
        >
          {unreliable ? "N/A" : `${score}/100`}
        </span>
      </div>

      {!unreliable && <ProgressBar value={score} color={color} className="mb-3" />}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
        <span className="text-text-secondary">
          Measured:{" "}
          <span className="text-text-primary">{measured}</span>
        </span>
        <span className="text-text-secondary">
          Ideal:{" "}
          <span style={{ color: "#2ECC71" }}>{ideal}</span>
        </span>
      </div>

      {!unreliable && (
        <div className="text-xs text-text-muted mb-2">
          Confidence: {Math.round(confidence * 100)}%
        </div>
      )}

      <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
      {unreliable && metric.reason && (
        <p className="text-xs text-text-muted mt-2">{metric.reason}</p>
      )}
    </div>
  )
}

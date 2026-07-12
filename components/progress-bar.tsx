"use client"

type ProgressBarProps = {
  value: number
  max?: number
  color?: string
  className?: string
}

export function ProgressBar({ value, max = 100, color, className = "" }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const barColor =
    color ??
    (value >= 78 ? "#2ECC71" : value >= 52 ? "#F5A623" : "#E74C3C")

  return (
    <div className={`h-2 w-full rounded-full bg-border overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  )
}

"use client"

import { getTier, getTierColor } from "@/utils/tier"

type BellCurveProps = {
  score: number
  className?: string
}

function normalPdf(x: number, mean = 50, sd = 15) {
  return Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
}

export function BellCurve({ score, className = "" }: BellCurveProps) {
  const width = 400
  const height = 160
  const padding = { left: 20, right: 20, top: 20, bottom: 30 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const points: string[] = []
  const samples = 100
  let maxY = 0
  const ys: number[] = []

  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * 100
    const y = normalPdf(x)
    ys.push(y)
    if (y > maxY) maxY = y
  }

  for (let i = 0; i <= samples; i++) {
    const x = padding.left + (i / samples) * plotW
    const y = padding.top + plotH - (ys[i] / maxY) * plotH
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
  }

  const markerX = padding.left + (score / 100) * plotW
  const markerY = padding.top + plotH - (normalPdf(score) / maxY) * plotH
  const tier = getTier(score)
  const tierColor = getTierColor(tier)

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
        Population Distribution
      </h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        aria-label={`Score distribution with your score at ${score}`}
      >
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path
          d={`${points.join(" ")} L${padding.left + plotW},${padding.top + plotH} L${padding.left},${padding.top + plotH} Z`}
          fill="url(#curveGrad)"
        />
        <path
          d={points.join(" ")}
          fill="none"
          stroke="#6C5CE7"
          strokeWidth="2"
          strokeOpacity="0.7"
        />

        <line
          x1={markerX}
          y1={padding.top}
          x2={markerX}
          y2={padding.top + plotH}
          stroke={tierColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.8"
        />
        <circle cx={markerX} cy={markerY} r="6" fill={tierColor} stroke="#0A0A0F" strokeWidth="2" />

        {[0, 25, 50, 75, 100].map((v) => (
          <text
            key={v}
            x={padding.left + (v / 100) * plotW}
            y={height - 6}
            textAnchor="middle"
            fill="#555566"
            fontSize="10"
          >
            {v}
          </text>
        ))}
      </svg>
      <p className="text-center text-sm mt-2">
        <span style={{ color: tierColor }} className="font-semibold">
          You · {score} — {tier}
        </span>
      </p>
    </div>
  )
}

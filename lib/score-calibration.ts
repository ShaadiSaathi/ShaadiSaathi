// lib/score-calibration.ts
// Shared scoring functions with corrected (non-harsh) falloff rates.

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Gaussian score centred on ideal. Higher k = steeper falloff. */
export function scoreGauss(val: number, ideal: number, k: number, cap = 98): number {
  return clamp(Math.round(100 * Math.exp(-k * (val - ideal) ** 2)), 10, cap)
}

/** Score inside [lo, hi] band; exponential penalty outside. */
export function scoreBand(val: number, lo: number, hi: number, steepness = 1.8): number {
  const mid = (lo + hi) / 2
  const half = (hi - lo) / 2 || 0.001
  const d = Math.abs(val - mid)
  if (d <= half) {
    return clamp(Math.round(100 - (d / half) * 14), 86, 100)
  }
  const excess = (d - half) / half
  return clamp(Math.round(86 * Math.exp(-steepness * excess)), 10, 85)
}

/** One-sided maximum (e.g. value ≤ threshold is ideal). */
export function scoreMax(val: number, max: number, steepness = 1.8): number {
  if (val <= max) {
    const headroom = max - val
    return clamp(Math.round(92 + Math.min(headroom / max, 0.15) * 8), 86, 100)
  }
  const excess = (val - max) / max
  return clamp(Math.round(86 * Math.exp(-steepness * excess)), 10, 85)
}

/** Equal-segment balance (facial thirds/fifths). */
export function scoreEqualSegments(segments: number[]): number {
  const total = segments.reduce((s, v) => s + v, 0) || 1
  const ideal = total / segments.length
  const maxDev = Math.max(...segments.map(s => Math.abs(s - ideal) / ideal))
  if (maxDev <= 0.05) return clamp(Math.round(100 - maxDev * 80), 90, 100)
  if (maxDev <= 0.15) return clamp(Math.round(96 - (maxDev - 0.05) * 320), 64, 95)
  return clamp(Math.round(70 * Math.exp(-2.5 * (maxDev - 0.15))), 15, 63)
}

/** Symmetry from mean lateral deviation (normalised to face width). */
export function scoreSymmetry(meanDev: number, scale = 180): number {
  return clamp(Math.round(100 - meanDev * scale), 15, 98)
}

/** Angle in degrees. */
export function scoreAngleDeg(val: number, ideal: number, tolDeg: number): number {
  const d = Math.abs(val - ideal)
  if (d <= tolDeg) return clamp(Math.round(100 - (d / tolDeg) * 12), 88, 100)
  const excess = (d - tolDeg) / tolDeg
  return clamp(Math.round(88 * Math.exp(-1.0 * excess)), 10, 87)
}

type WeightedScore = { score: number; weight: number }

/** Overall from weighted metrics with moderate weakest-link influence. */
export function aggregateOverall(
  items: WeightedScore[],
  harmonyOverall?: number,
  harmonyWeight = 0.22
): number {
  if (items.length === 0) return 0

  const totalW = items.reduce((s, x) => s + x.weight, 0) || 1
  const weightedMean = items.reduce((s, x) => s + x.score * x.weight, 0) / totalW

  const sorted = items.map(i => i.score).sort((a, b) => a - b)
  const n = sorted.length
  const bottom3 = sorted.slice(0, Math.min(3, n))
  const top3 = sorted.slice(-Math.min(3, n))
  const weakAvg = bottom3.reduce((a, b) => a + b, 0) / bottom3.length
  const strongAvg = top3.reduce((a, b) => a + b, 0) / top3.length

  let raw = weightedMean * 0.75 + weakAvg * 0.25

  const eliteCount = sorted.filter(s => s >= 88).length
  const weakCount = sorted.filter(s => s < 45).length
  if (eliteCount >= 4 && weakAvg >= 70) {
    raw = raw * 0.85 + strongAvg * 0.15
  }

  if (weakCount >= 4) {
    raw = Math.min(raw, weightedMean * 0.92 + weakAvg * 0.08)
  }

  if (harmonyOverall != null) {
    raw = raw * (1 - harmonyWeight) + harmonyOverall * harmonyWeight
  }

  return clamp(Math.round(raw), 15, 98)
}

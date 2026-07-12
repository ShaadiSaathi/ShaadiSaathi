import type { Point, BreakdownItem, FaceResults } from "./face-analysis"
import { SIDE_IDEALS } from "./side-profile-ideals"
import { computeSideMetrics, type SideMetric } from "./side-profile-measurements"
import { scoreBand, aggregateOverall } from "./score-calibration"

const WEIGHTS: Record<string, number> = {
  nasofrontal:         0.06,
  nasolabial:          0.08,
  mentolabial:         0.06,
  gonial:              0.12,
  cervicomental:       0.08,
  facialConvexity:     0.10,
  totalConvexity:      0.10,
  nasomental:          0.06,
  nasofacial:          0.05,
  nasalTip:            0.05,
  nasalProjection:     0.06,
  mandibularPlane:     0.06,
  eLineUpper:          0.04,
  eLineLower:          0.04,
  foreheadInclination: 0.04,
}

function scoreMetric(key: string, value: number, gender: "male" | "female"): number {
  const I = SIDE_IDEALS[gender]
  const st = 1.0
  switch (key) {
    case "nasofrontal":         return scoreBand(value, I.nasofrontal.lo, I.nasofrontal.hi, st)
    case "nasolabial":          return scoreBand(value, I.nasolabial.lo, I.nasolabial.hi, st)
    case "mentolabial":         return scoreBand(value, I.mentolabial.lo, I.mentolabial.hi, st)
    case "gonial":              return scoreBand(value, I.gonialAngle.lo, I.gonialAngle.hi, st)
    case "cervicomental":       return scoreBand(value, I.cervicomental.lo, I.cervicomental.hi, st)
    case "facialConvexity":     return scoreBand(value, I.facialConvexity.lo, I.facialConvexity.hi, st)
    case "totalConvexity":      return scoreBand(value, I.totalFacialConvexity.lo, I.totalFacialConvexity.hi, st)
    case "nasomental":          return scoreBand(value, I.nasomental.lo, I.nasomental.hi, st)
    case "nasofacial":          return scoreBand(value, I.nasofacial.lo, I.nasofacial.hi, st)
    case "nasalTip":            return scoreBand(value, I.nasalTipAngle.lo, I.nasalTipAngle.hi, st)
    case "nasalProjection":     return scoreBand(value, I.nasalProjection.lo, I.nasalProjection.hi, 0.8)
    case "mandibularPlane":     return scoreBand(value, I.mandibularPlane.lo, I.mandibularPlane.hi, st)
    case "eLineUpper":          return scoreBand(value, I.eLineUpper.lo, I.eLineUpper.hi, 0.8)
    case "eLineLower":          return scoreBand(value, I.eLineLower.lo, I.eLineLower.hi, 0.8)
    case "foreheadInclination": return scoreBand(value, I.foreheadInclination.lo, I.foreheadInclination.hi, 0.8)
    default: return 50
  }
}

function getIdealLabel(key: string, gender: "male" | "female"): string {
  const I = SIDE_IDEALS[gender]
  const map: Record<string, string> = {
    nasofrontal: I.nasofrontal.label, nasolabial: I.nasolabial.label,
    mentolabial: I.mentolabial.label, gonial: I.gonialAngle.label,
    cervicomental: I.cervicomental.label, facialConvexity: I.facialConvexity.label,
    totalConvexity: I.totalFacialConvexity.label, nasomental: I.nasomental.label,
    nasofacial: I.nasofacial.label, nasalTip: I.nasalTipAngle.label,
    nasalProjection: I.nasalProjection.label, mandibularPlane: I.mandibularPlane.label,
    eLineUpper: I.eLineUpper.label, eLineLower: I.eLineLower.label,
    foreheadInclination: I.foreheadInclination.label,
  }
  return map[key] ?? "—"
}

function formatValue(m: SideMetric): string {
  if (m.value == null) return "N/A"
  if (m.unit === "°") return `${m.value.toFixed(1)}°`
  if (m.unit === "mm") return `${m.value.toFixed(1)} mm`
  if (m.unit === "ratio") return m.value.toFixed(3)
  return m.value.toFixed(2)
}

function tip(score: number, good: string, mid: string, poor: string) {
  return score >= 78 ? good : score >= 52 ? mid : poor
}

export function scoreSideProfile(
  landmarks: Point[],
  gender: "male" | "female",
  _yawDeg?: number,
  _prep?: unknown
): FaceResults {
  const rawMetrics = computeSideMetrics(landmarks)
  const breakdown: BreakdownItem[] = []
  const overallItems: { score: number; weight: number }[] = []

  for (const m of rawMetrics) {
    const score = m.value != null && !m.unreliable ? scoreMetric(m.key, m.value, gender) : 0
    const weight = WEIGHTS[m.key] ?? 0
    const ideal = getIdealLabel(m.key, gender)

    if (m.value != null && !m.unreliable && weight > 0) {
      overallItems.push({ score, weight })
    }

    breakdown.push({
      label: m.label,
      score: m.unreliable ? 0 : score,
      measured: formatValue(m),
      ideal,
      tip: m.unreliable
        ? m.reason
        : tip(score,
            `${m.label} at ${formatValue(m)} — within the ideal range.`,
            `${m.label} at ${formatValue(m)} — close to ideal (${ideal}).`,
            `${m.label} at ${formatValue(m)} — has room to improve toward ${ideal}.`
          ),
      confidence: m.confidence,
      unreliable: m.unreliable,
      reason: m.reason,
    })
  }

  const overall = aggregateOverall(overallItems)

  const chatSeed =
    `My Refine ${gender} SIDE PROFILE scan — Overall: ${overall}/100.\n` +
    breakdown.filter(b => !b.unreliable)
      .map(b => `${b.label}: ${b.score}/100 (${b.measured}, ideal ${b.ideal})`)
      .join("\n")

  return { overall, breakdown, chatSeed, gender }
}

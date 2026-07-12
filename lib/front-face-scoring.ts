// lib/front-face-scoring.ts
// Turns raw metrics into scored breakdown + overall.

import type { Point, BreakdownItem, FaceResults } from "./face-analysis"
import { calculateHarmony } from "./harmony-analysis"
import { FRONT_IDEALS } from "./facial-ideals"
import {
  prepareFrontAnalysis, computeFrontMetrics, metricMap, getIdealLabel,
  CONFIDENCE_THRESHOLD, type RawMetric,
} from "./front-face-measurements-mp"
import {
  scoreBand, scoreGauss, scoreSymmetry, scoreAngleDeg, scoreEqualSegments,
  aggregateOverall, clamp,
} from "./score-calibration"

function tip(score: number, good: string, mid: string, poor: string) {
  return score >= 78 ? good : score >= 52 ? mid : poor
}

function formatMeasured(key: string, value: number | null, m: RawMetric): string {
  if (value == null || m.unreliable) return "N/A"
  if (key === "canthal" || key === "eme") return `${value.toFixed(1)}°`
  if (key === "symmetry") return `${Math.round(100 - value * 180)}/100`
  if (key === "fifths") return `max dev ${(value * 100).toFixed(0)}%`
  if (key.startsWith("thirds") && key !== "thirdsRatio") return `${(value * 100).toFixed(0)}%`
  return value.toFixed(2)
}

function scoreMetric(key: string, value: number | null, gender: "male" | "female"): number | null {
  if (value == null) return null
  const I = FRONT_IDEALS[gender]
  switch (key) {
    case "fwhr": return scoreBand(value, I.fwhr.lo, I.fwhr.hi, 1.2)
    case "lowerFull": return scoreBand(value, I.lowerFaceRatio.lo, I.lowerFaceRatio.hi, 1.2)
    case "midface": return scoreBand(value, I.midfaceRatio.lo, I.midfaceRatio.hi)
    case "mouthNose": return scoreBand(value, I.mouthNose.lo, I.mouthNose.hi, 1.0)
    case "lipRatio": return scoreBand(value, I.lipRatio.lo, I.lipRatio.hi, 1.0)
    case "chinPhiltrum": return scoreBand(value, I.chinPhiltrum.lo, I.chinPhiltrum.hi)
    case "cbJaw": return scoreBand(value, I.bzygBigonial.lo, I.bzygBigonial.hi)
    case "eyeSpacing": return scoreGauss(value, I.eyeSpacing.mid, 18)
    case "ear": return scoreBand(value, I.palpebralFissure.lo, I.palpebralFissure.hi)
    case "eme": return scoreAngleDeg(value, 48.5, 6)
    case "canthal":
      return value >= 0
        ? scoreAngleDeg(value, I.canthalTilt.mid, 4)
        : clamp(scoreAngleDeg(value, I.canthalTilt.mid, 3) - 15, 10, 65)
    case "symmetry": return scoreSymmetry(value, 180)
    case "thirdsRatio": return scoreGauss(value, I.facialThirds.mid, 22)
    case "flw": return scoreBand(value, I.faceLengthWidth.lo, I.faceLengthWidth.hi, 1.0)
    case "fifths":
      return value <= 0.08
        ? clamp(Math.round(100 - value * 100), 88, 100)
        : clamp(Math.round(85 * Math.exp(-3.5 * (value - 0.08) ** 2)), 20, 84)
    default: return null
  }
}

const METRIC_LABELS: Record<string, string> = {
  fwhr: "FWHR", lowerFull: "Lower / Full Face", midface: "Midface Ratio",
  mouthNose: "Mouth–Nose Ratio", lipRatio: "Lower / Upper Lip", chinPhiltrum: "Chin–Philtrum Ratio",
  cbJaw: "Cheekbone–Jaw Ratio", eyeSpacing: "Eye Spacing", ear: "Eye Aspect Ratio",
  eme: "EME Angle", canthal: "Canthal Tilt", gonial: "Gonial Angle", symmetry: "Facial Symmetry",
  thirdsRatio: "Facial Thirds", fifths: "Facial Fifths", cervicomental: "Cervicomental Angle",
  flw: "Face Length : Width",
}

const WEIGHTS: Record<string, Record<string, number>> = {
  male: {
    canthal: 0.12, fwhr: 0.10, cbJaw: 0.10, symmetry: 0.09, eyeSpacing: 0.07,
    thirdsRatio: 0.06, mouthNose: 0.07, ear: 0.06, chinPhiltrum: 0.05, midface: 0.05,
    lowerFull: 0.04, lipRatio: 0.03, eme: 0.04, fifths: 0.03, flw: 0.03,
  },
  female: {
    canthal: 0.16, cbJaw: 0.14, fwhr: 0.10, symmetry: 0.10, eyeSpacing: 0.08,
    thirdsRatio: 0.08, mouthNose: 0.08, ear: 0.06, chinPhiltrum: 0.05, flw: 0.04,
    lipRatio: 0.03, lowerFull: 0.03, midface: 0.03, fifths: 0.02,
  },
}

function buildTips(key: string, score: number, value: number | null, gender: "male" | "female"): string {
  const v = value != null ? (key === "canthal" || key === "eme" ? `${value.toFixed(1)}°` : value.toFixed(2)) : "N/A"
  if (key === "gonial") return "Cannot be measured accurately from a front photo. Use the Side Profile scanner."
  if (key === "cervicomental") return "Requires a side profile photo. Use the Side Profile scanner."
  return tip(score,
    `${METRIC_LABELS[key]} at ${v} — within the ideal range.`,
    `${METRIC_LABELS[key]} at ${v} — close to ideal (${getIdealLabel(key, gender)}).`,
    `${METRIC_LABELS[key]} at ${v} — has room to improve toward ${getIdealLabel(key, gender)}.`
  )
}

export function scoreFrontFace(positions: Point[], gender: "male" | "female"): FaceResults {
  const prep = prepareFrontAnalysis(positions)
  const rawMetrics = computeFrontMetrics(prep)
  const m = metricMap(rawMetrics)
  const weights = WEIGHTS[gender]

  const breakdown: BreakdownItem[] = []
  const overallItems: { score: number; weight: number }[] = []

  const keysToShow = ["fwhr", "lowerFull", "midface", "mouthNose", "lipRatio", "chinPhiltrum",
    "cbJaw", "eyeSpacing", "ear", "eme", "canthal", "gonial", "symmetry", "thirdsRatio",
    "fifths", "cervicomental", "flw"]

  for (const key of keysToShow) {
    const rm = m.get(key)
    if (!rm) continue
    let score: number | null = (key === "gonial" || key === "cervicomental") ? null : scoreMetric(key, rm.value, gender)
    const unreliable = rm.unreliable || rm.confidence < CONFIDENCE_THRESHOLD
    const includeInOverall = score != null && !unreliable && (weights[key] ?? 0) > 0
    if (includeInOverall && score != null) overallItems.push({ score, weight: weights[key] })
    breakdown.push({
      label: METRIC_LABELS[key] ?? key,
      score: score ?? 0,
      measured: formatMeasured(key, rm.value, rm),
      ideal: getIdealLabel(key, gender),
      tip: unreliable ? rm.reason : buildTips(key, score ?? 0, rm.value, gender),
      confidence: Math.round(rm.confidence * 100) / 100,
      unreliable,
      reason: rm.reason,
    })
  }

  const harmonyResult = calculateHarmony(prep.normalized, gender)
  const overall = aggregateOverall(overallItems, harmonyResult.overall, 0.22)

  breakdown.push(
    { label: "Averageness", score: harmonyResult.averageness, ideal: "High", measured: `${harmonyResult.averageness}`, tip: "Population-mean proportion deviation.", confidence: 0.85, reason: "Normalised proportion deviations" },
    { label: "Facial Harmony", score: harmonyResult.harmony, ideal: "High", measured: `${harmonyResult.harmony}`, tip: "Cross-metric consistency score.", confidence: 0.85, reason: "Variance of proportion metrics" },
  )

  const chatSeed = `My Refine ${gender} FRONT facial scan — Overall: ${overall}/100.\n` +
    breakdown.filter(b => !b.unreliable).map(b => `${b.label}: ${b.score}/100 (${b.measured}, ideal ${b.ideal})`).join("\n")

  return { overall, breakdown, chatSeed, gender }
}

export { prepareFrontAnalysis, validateFrontImageQuality } from "./front-face-measurements-mp"

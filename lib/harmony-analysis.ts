// lib/harmony-analysis.ts
// Harmony, averageness, symmetry, dimorphism, adiposity — MediaPipe 478-point.

import type { Point } from "./face-analysis"
import { FRONT_IDEALS } from "./facial-ideals"
import { scoreBand as scoreBandCal, scoreSymmetry, clamp } from "./score-calibration"

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export type HarmonyResult = {
  symmetry: number
  averageness: number
  harmony: number
  dimorphism: number
  adiposity: number
  overall: number
}

export function calculateHarmony(
  p: Point[],
  gender: "male" | "female"
): HarmonyResult {
  const F = FRONT_IDEALS[gender]

  const faceW = dist(p[234], p[454]) || 1
  const faceH = Math.abs(p[152].y - p[10].y) || 1

  const midX = (p[234].x + p[454].x) / 2
  const pairs: [number, number][] = [
    [33, 263], [133, 362], [129, 358], [61, 291],
    [234, 454], [172, 397], [70, 300], [105, 334],
  ]
  const symDev = pairs
    .map(([l, r]) =>
      Math.abs(Math.abs(p[l].x - midX) - Math.abs(p[r].x - midX)) / faceW
    )
    .reduce((s, d) => s + d, 0) / pairs.length
  const symmetry = scoreSymmetry(symDev, 180)

  const eyeW = ((dist(p[33], p[133]) + dist(p[263], p[362])) / 2) / faceW
  const interocular = dist(p[133], p[362]) / faceW
  const noseW = dist(p[129], p[358]) / faceW
  const mouthW = dist(p[61], p[291]) / faceW
  const midface = Math.abs(p[13].y - (p[133].y + p[362].y) / 2) / faceH
  const lowerThird = Math.abs(p[152].y - p[164].y) / faceH

  const IDEAL_MP = {
    eyeWidthRatio: 0.19,
    interocularRatio: 0.22,
    noseWidthRatio: 0.18,
    mouthWidthRatio: 0.28,
    midfaceRatio: 0.20,
    lowerThirdRatio: 0.30,
  }

  const devs = [
    Math.abs(eyeW - IDEAL_MP.eyeWidthRatio) / IDEAL_MP.eyeWidthRatio,
    Math.abs(interocular - IDEAL_MP.interocularRatio) / IDEAL_MP.interocularRatio,
    Math.abs(noseW - IDEAL_MP.noseWidthRatio) / IDEAL_MP.noseWidthRatio,
    Math.abs(mouthW - IDEAL_MP.mouthWidthRatio) / IDEAL_MP.mouthWidthRatio,
    Math.abs(midface - IDEAL_MP.midfaceRatio) / IDEAL_MP.midfaceRatio,
    Math.abs(lowerThird - IDEAL_MP.lowerThirdRatio) / IDEAL_MP.lowerThirdRatio,
  ]

  const meanDev = devs.reduce((s, d) => s + d, 0) / devs.length
  const averageness = clamp(Math.round(100 - meanDev * 100), 20, 96)
  const varDev = devs.reduce((s, d) => s + (d - meanDev) ** 2, 0) / devs.length
  const harmony = clamp(Math.round(100 - Math.sqrt(varDev) * 150), 20, 96)

  const bizy = dist(p[234], p[454])
  const jawW = dist(p[172], p[397])
  const bzygRatio = bizy / (jawW || 1)
  const dimorphism = scoreBandCal(bzygRatio, F.bzygBigonial.lo, F.bzygBigonial.hi)

  const jawFullness = jawW / (bizy || 1)
  const adiposity = clamp(
    Math.round(100 - clamp((jawFullness - 0.76) / 0.22, 0, 1) * 72),
    15, 96
  )

  const overall = Math.round(
    symmetry * 0.24 +
    averageness * 0.24 +
    harmony * 0.22 +
    dimorphism * 0.18 +
    adiposity * 0.12
  )

  return {
    symmetry,
    averageness,
    harmony,
    dimorphism,
    adiposity,
    overall: clamp(overall, 15, 96),
  }
}

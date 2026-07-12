// lib/anthropometry/outlier-detection.ts
// Manual Ch.2 §2.1.19 — proportion outlier checks (soft flags, not hard rejects).

import type { AnnotatedProfileLandmarks } from "./landmark-registry"
import { PROFILE_ATLAS } from "./landmark-atlas"

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export type OutlierFlag = {
  landmarkId: string
  message: string
  measured: number
  expected: string
}

export function detectProportionOutliers(
  lm: AnnotatedProfileLandmarks
): OutlierFlag[] {
  const flags: OutlierFlag[] = []
  const faceH = dist(lm.nasion, lm.menton) || 1

  const checks: {
    key: keyof AnnotatedProfileLandmarks
    from: keyof AnnotatedProfileLandmarks
    atlasKey: string
  }[] = [
    { key: "pronasale", from: "nasion", atlasKey: "pronasale" },
    { key: "subnasale", from: "pronasale", atlasKey: "subnasale" },
    { key: "upperLip", from: "subnasale", atlasKey: "upperLip" },
  ]

  for (const { key, from, atlasKey } of checks) {
    const spec = PROFILE_ATLAS[atlasKey]
    if (!spec?.proportionRange) continue

    const ratio = dist(lm[from], lm[key]) / faceH
    const { lo, hi, ref } = spec.proportionRange

    if (ratio < lo * 0.5 || ratio > hi * 2.5) {
      flags.push({
        landmarkId: key,
        message: `Proportion outlier — re-evaluate ${spec.name}`,
        measured: ratio,
        expected: ref + ` (${lo.toFixed(2)}–${hi.toFixed(2)})`,
      })
      lm[key].confidence *= 0.75
    }
  }

  // §2.1.12 relationship: subnasale between pronasale and upper lip (vertical)
  if (lm.subnasale.y < lm.pronasale.y - faceH * 0.02) {
    flags.push({
      landmarkId: "subnasale",
      message: "Subnasale superior to pronasale — landmark placement suspect",
      measured: lm.subnasale.y - lm.pronasale.y,
      expected: "subnasale inferior to pronasale",
    })
    lm.subnasale.confidence *= 0.7
  }

  return flags
}

export function applyAnatomicalAgreement(
  lm: AnnotatedProfileLandmarks
): number {
  let agreement = 1.0
  const faceH = dist(lm.nasion, lm.menton) || 1
  const tol = faceH * 0.06

  if (lm.upperLip.y < lm.subnasale.y - tol) agreement *= 0.85
  if (lm.menton.y < lm.pogonion.y - tol) agreement *= 0.85
  if (lm.subnasale.y < lm.pronasale.y - tol) agreement *= 0.8

  return agreement
}

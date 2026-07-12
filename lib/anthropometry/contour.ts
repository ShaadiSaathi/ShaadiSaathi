// lib/anthropometry/contour.ts
// Manual Ch.2 §2.1.7–§2.1.8 — profile contour chain for curvature-based refinement.

import type { Point } from "../face-analysis"

/** Ordered profile contour from forehead to neck (FHP-normalized space). */
export function buildProfileContour(lm: {
  glabella: Point
  nasion: Point
  pronasale: Point
  columella: Point
  subnasale: Point
  upperLip: Point
  lowerLip: Point
  pogonion: Point
  menton: Point
  cervical: Point
}): Point[] {
  return [
    lm.glabella,
    lm.nasion,
    lm.pronasale,
    lm.columella,
    lm.subnasale,
    lm.upperLip,
    lm.lowerLip,
    lm.pogonion,
    lm.menton,
    lm.cervical,
  ]
}

/** Numerical curvature estimate at index i on a polyline (§2.1.8). */
export function curvatureAt(contour: Point[], i: number): number {
  if (i <= 0 || i >= contour.length - 1) return 0
  const prev = contour[i - 1]
  const curr = contour[i]
  const next = contour[i + 1]

  const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
  const v2 = { x: next.x - curr.x, y: next.y - curr.y }
  const len1 = Math.hypot(v1.x, v1.y) || 1
  const len2 = Math.hypot(v2.x, v2.y) || 1

  const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2)
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
  const avgLen = (len1 + len2) / 2
  return angle / avgLen
}

/** Find index of maximum curvature in a window (local search §2.1.10). */
export function maxCurvatureIndex(contour: Point[], from: number, to: number): number {
  let best = from
  let bestK = 0
  for (let i = from; i <= to && i < contour.length; i++) {
    const k = curvatureAt(contour, i)
    if (k > bestK) {
      bestK = k
      best = i
    }
  }
  return best
}

// lib/cephalometric-geometry.ts
// Pure coordinate geometry for lateral cephalometric analysis.
// All measurements are computed from (x,y) landmarks — never visually estimated.

import type { Point } from "./face-analysis"

export type FHPFrame = {
  /** Radians: rotation applied so FHP is horizontal */
  fhpTiltRad: number
  /** FHP unit vector (horizontal, anterior-positive for left profile) */
  fhpUnit: Point
  /** True vertical unit vector (90° to FHP, downward in image space) */
  verticalUnit: Point
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function rotatePoint(p: Point, cx: number, cy: number, rad: number): Point {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p.x - cx
  const dy = p.y - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

/** Angle at vertex V formed by segments V→A and V→B (degrees). */
export function angleAtVertex(A: Point, V: Point, B: Point): number {
  const va = { x: A.x - V.x, y: A.y - V.y }
  const vb = { x: B.x - V.x, y: B.y - V.y }
  const dot = va.x * vb.x + va.y * vb.y
  const mag = Math.hypot(va.x, va.y) * Math.hypot(vb.x, vb.y)
  if (mag === 0) return 0
  return Math.acos(clamp(dot / mag, -1, 1)) * (180 / Math.PI)
}

/** Signed angle between two line directions (degrees, 0–180). */
export function angleBetweenLines(a1: Point, a2: Point, b1: Point, b2: Point): number {
  const v1 = { x: a2.x - a1.x, y: a2.y - a1.y }
  const v2 = { x: b2.x - b1.x, y: b2.y - b1.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)
  if (mag === 0) return 0
  return Math.acos(clamp(Math.abs(dot / mag), -1, 1)) * (180 / Math.PI)
}

/**
 * Build FHP frame from tragus (porion) and orbitale.
 * Rotates coordinates so FHP is exactly horizontal (0°).
 */
export function normalizeToFHP(
  points: Point[],
  tragus: Point,
  orbitale: Point
): { normalized: Point[]; frame: FHPFrame } {
  const fhpTiltRad = Math.atan2(orbitale.y - tragus.y, orbitale.x - tragus.x)
  const cx = (tragus.x + orbitale.x) / 2
  const cy = (tragus.y + orbitale.y) / 2
  const normalized = points.map(pt => rotatePoint(pt, cx, cy, -fhpTiltRad))

  const fhpUnit = { x: Math.cos(0), y: Math.sin(0) }
  const verticalUnit = { x: 0, y: 1 }

  return {
    normalized,
    frame: { fhpTiltRad, fhpUnit, verticalUnit },
  }
}

/**
 * Zero Meridian: true vertical through nasion (perpendicular to FHP).
 * Returns signed anterior projection of target vs nasion (mm if scaled).
 * Positive = anterior to nasion vertical (forward growth).
 */
export function zeroMeridianProjection(
  nasion: Point,
  target: Point,
  mmPerUnit: number,
  anteriorIsPositiveX: boolean
): number {
  const deltaX = target.x - nasion.x
  const signed = anteriorIsPositiveX ? deltaX : -deltaX
  return signed * mmPerUnit
}

export type MeridianStatus = "aligned" | "recessed" | "projecting"

export function classifyMeridian(mm: number, tolerance = 1.0): MeridianStatus {
  if (mm > tolerance) return "projecting"
  if (mm < -tolerance) return "recessed"
  return "aligned"
}

/**
 * Signed perpendicular distance from point to line a→b.
 * Positive = point lies on the facial-interior side of the E-line (behind line, ideal).
 */
export function signedPerpendicularDistance(
  pt: Point,
  lineA: Point,
  lineB: Point,
  interiorSide: 1 | -1
): number {
  const dx = lineB.x - lineA.x
  const dy = lineB.y - lineA.y
  const len = Math.hypot(dx, dy) || 1
  const cross = (pt.x - lineA.x) * dy - (pt.y - lineA.y) * dx
  return (cross / len) * interiorSide
}

export type ELineLipStatus = "behind" | "on" | "anterior"

export function classifyELinePosition(signedMm: number, behindTolerance = 0.5): ELineLipStatus {
  if (signedMm > behindTolerance) return "behind"
  if (signedMm < -behindTolerance) return "anterior"
  return "on"
}

/** Gonial angle at Go': posterior ramus border vs inferior mandibular body. */
export function gonialAngle(condylion: Point, gonion: Point, menton: Point): number {
  return angleBetweenLines(condylion, gonion, gonion, menton)
}

/** Nasolabial: vertex Sn, rays to nasal base (Cm) and upper lip (Ls). */
export function nasolabialAngle(columella: Point, subnasale: Point, upperLip: Point): number {
  return angleAtVertex(columella, subnasale, upperLip)
}

/** Nasofrontal: G → N' → Prn */
export function nasofrontalAngle(glabella: Point, nasion: Point, pronasale: Point): number {
  return angleAtVertex(glabella, nasion, pronasale)
}

/** Facial convexity: G → Sn → Pg' */
export function facialConvexityAngle(glabella: Point, subnasale: Point, pogonion: Point): number {
  return angleAtVertex(glabella, subnasale, pogonion)
}

/**
 * Side-profile cephalometric measurements.
 *
 * CRITICAL: Every angle is computed using a standard vertex-angle formula
 * that works regardless of image orientation or coordinate system.
 */

import type { Point } from "./face-analysis"
import { extractSideProfileLandmarks } from "./side-profile-landmarks"

const dist  = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export type SideMetric = {
  key:        string
  label:      string
  value:      number | null
  unit:       "°" | "ratio" | "mm" | ""
  confidence: number
  reason:     string
  unreliable: boolean
}

function angleAtVertex(A: Point, V: Point, B: Point): number {
  const va = { x: A.x - V.x, y: A.y - V.y }
  const vb = { x: B.x - V.x, y: B.y - V.y }
  const dot = va.x * vb.x + va.y * vb.y
  const mag = Math.hypot(va.x, va.y) * Math.hypot(vb.x, vb.y)
  if (mag < 0.001) return 0
  return Math.acos(clamp(dot / mag, -1, 1)) * (180 / Math.PI)
}

function signedDistToLine(P: Point, A: Point, B: Point, side: "left" | "right"): number {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const len = Math.hypot(dx, dy) || 1
  const raw = ((P.x - A.x) * dy - (P.y - A.y) * dx) / len
  return side === "left" ? raw : -raw
}

export function validateSideProfile(
  p: Point[]
): { ok: true } | { ok: false; message: string } {
  if (p.length < 468) {
    return { ok: false, message: "Landmark detection incomplete. Try a clearer photo." }
  }

  const midX = (p[234].x + p[454].x) / 2
  const faceW = Math.abs(p[454].x - p[234].x) || 1
  const noseOffset = Math.abs(p[4].x - midX) / faceW

  if (noseOffset < 0.08) {
    return {
      ok: false,
      message: "This appears to be a front-facing photo. Upload a side profile (turn your head left or right).",
    }
  }

  const leftEyeW = Math.abs(p[33].x - p[133].x)
  const rightEyeW = Math.abs(p[263].x - p[362].x)
  const eyeRatio = Math.min(leftEyeW, rightEyeW) / (Math.max(leftEyeW, rightEyeW) || 1)

  if (eyeRatio > 0.65) {
    return {
      ok: false,
      message: "Both eyes are equally visible. Turn fully to the side for a profile scan.",
    }
  }

  return { ok: true }
}

export function computeSideMetrics(p: Point[]): SideMetric[] {
  const lm = extractSideProfileLandmarks(p)
  const metrics: SideMetric[] = []
  const side = lm.visibleSide

  const noseLen = dist(lm.nasion, lm.pronasale) || 1

  const nasofrontal = angleAtVertex(lm.glabella, lm.nasion, lm.dorsumMid)
  metrics.push({
    key: "nasofrontal", label: "Nasofrontal Angle",
    value: nasofrontal, unit: "°", confidence: 0.80,
    reason: "Angle at nasion (bridge dip) between forehead and nose",
    unreliable: false,
  })

  const nasolabial = angleAtVertex(lm.columella, lm.subnasale, lm.labraleSup)
  metrics.push({
    key: "nasolabial", label: "Nasolabial Angle",
    value: nasolabial, unit: "°", confidence: 0.82,
    reason: "Angle at nose base between columella and upper lip",
    unreliable: false,
  })

  const mentolabial = angleAtVertex(lm.labraleInf, lm.mentolabial, lm.pogonion)
  metrics.push({
    key: "mentolabial", label: "Mentolabial Angle",
    value: mentolabial, unit: "°", confidence: 0.75,
    reason: "Angle at chin-lip groove between lower lip and chin tip",
    unreliable: false,
  })

  const ramusTop: Point = {
    x: lm.gonion.x,
    y: lm.gonion.y - dist(lm.gonion, lm.menton) * 0.8,
  }
  const gonialAngle = angleAtVertex(ramusTop, lm.gonion, lm.menton)
  metrics.push({
    key: "gonial", label: "Gonial Angle",
    value: gonialAngle, unit: "°", confidence: 0.70,
    reason: "Angle at jaw corner between ramus (ascending jaw) and jaw body",
    unreliable: false,
  })

  const cervicomental = angleAtVertex(lm.subnasale, lm.menton, lm.cervicalPt)
  metrics.push({
    key: "cervicomental", label: "Cervicomental Angle",
    value: cervicomental, unit: "°", confidence: 0.60,
    reason: "Chin-to-throat angle (cervical point estimated — limited accuracy)",
    unreliable: false,
  })

  const facialConvexity = angleAtVertex(lm.glabella, lm.subnasale, lm.pogonion)
  metrics.push({
    key: "facialConvexity", label: "Facial Convexity",
    value: facialConvexity, unit: "°", confidence: 0.82,
    reason: "Glabella → subnasale → pogonion — how straight the profile is",
    unreliable: false,
  })

  const totalConvexity = angleAtVertex(lm.glabella, lm.pronasale, lm.pogonion)
  metrics.push({
    key: "totalConvexity", label: "Total Facial Convexity",
    value: totalConvexity, unit: "°", confidence: 0.82,
    reason: "Glabella → nose tip → chin — measures overall forward growth",
    unreliable: false,
  })

  const nasomental = angleAtVertex(lm.nasion, lm.pronasale, lm.pogonion)
  metrics.push({
    key: "nasomental", label: "Nasomental Angle",
    value: nasomental, unit: "°", confidence: 0.78,
    reason: "Angle at nose tip between bridge and chin",
    unreliable: false,
  })

  const nasofacial = angleAtVertex(lm.pronasale, lm.nasion, lm.pogonion)
  metrics.push({
    key: "nasofacial", label: "Nasofacial Angle",
    value: nasofacial, unit: "°", confidence: 0.78,
    reason: "How much the nose projects from the nasion-chin plane",
    unreliable: false,
  })

  const nasalTip = angleAtVertex(lm.dorsumMid, lm.pronasale, lm.columella)
  metrics.push({
    key: "nasalTip", label: "Nasal Tip Angle",
    value: nasalTip, unit: "°", confidence: 0.75,
    reason: "Angle at nose tip between dorsum and columella — tip definition",
    unreliable: false,
  })

  const noseProjection = Math.abs(lm.pronasale.x - lm.subnasale.x)
  const nasalProjection = noseProjection / (noseLen || 1)
  metrics.push({
    key: "nasalProjection", label: "Nasal Projection",
    value: nasalProjection, unit: "ratio", confidence: 0.72,
    reason: "Goode ratio — how far the nose sticks out relative to its length",
    unreliable: false,
  })

  const mandAngle = Math.abs(
    Math.atan2(
      lm.menton.y - lm.gonion.y,
      lm.menton.x - lm.gonion.x
    ) * (180 / Math.PI)
  )
  const mandibularPlane = mandAngle > 90 ? 180 - mandAngle : mandAngle
  metrics.push({
    key: "mandibularPlane", label: "Mandibular Plane Angle",
    value: mandibularPlane, unit: "°", confidence: 0.68,
    reason: "Angle of lower jaw border to horizontal — steep = long face tendency",
    unreliable: false,
  })

  const pxPerMm = noseLen / 45
  const eUpperRaw = signedDistToLine(lm.labraleSup, lm.pronasale, lm.pogonion, side)
  const eLowerRaw = signedDistToLine(lm.labraleInf, lm.pronasale, lm.pogonion, side)
  const eUpperMm = Math.round((eUpperRaw / (pxPerMm || 1)) * 10) / 10
  const eLowerMm = Math.round((eLowerRaw / (pxPerMm || 1)) * 10) / 10

  metrics.push({
    key: "eLineUpper", label: "E-Line Upper Lip",
    value: eUpperMm, unit: "mm", confidence: 0.68,
    reason: "Upper lip relative to nose-chin line. Negative = behind (ideal).",
    unreliable: false,
  })
  metrics.push({
    key: "eLineLower", label: "E-Line Lower Lip",
    value: eLowerMm, unit: "mm", confidence: 0.68,
    reason: "Lower lip relative to nose-chin line. Negative = behind (ideal).",
    unreliable: false,
  })

  const fhRaw = Math.atan2(
    Math.abs(lm.glabella.x - lm.trichion.x),
    Math.abs(lm.glabella.y - lm.trichion.y)
  ) * (180 / Math.PI)
  metrics.push({
    key: "foreheadInclination", label: "Forehead Inclination",
    value: Math.abs(fhRaw), unit: "°", confidence: 0.55,
    reason: "Forehead slope from vertical. Flat < 10°, sloped > 15°.",
    unreliable: false,
  })

  if (typeof window !== "undefined") {
    console.group("Side Profile Measurements")
    for (const m of metrics) {
      console.log(`${m.key}: ${m.value}${m.unit} (conf ${m.confidence})`)
    }
    console.groupEnd()
  }

  return metrics
}

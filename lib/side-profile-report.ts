// lib/side-profile-report.ts
// Clinical cephalometric report from computed geometry (Arnett/Steiner soft-tissue norms).

import type { ProfileLandmarks, ProfilePrep } from "./side-profile-measurements-mp"
import {
  classifyELinePosition,
  classifyMeridian,
  type ELineLipStatus,
  type MeridianStatus,
} from "./cephalometric-geometry"
import { PROFILE_IDEALS } from "./profile-ideals"

export type AngleReading = {
  metric: string
  value: number
  unit: "°"
  norm: string
  status: "normal" | "borderline" | "abnormal"
}

export type LinearReading = {
  metric: string
  value: string
  status: string
}

export type ClinicalReport = {
  angles: AngleReading[]
  linear: LinearReading[]
  conclusion: string
  maxillaAssessment: string
  mandibleAssessment: string
  landmarkCoords: Record<string, { x: number; y: number }>
}

function angleStatus(
  value: number,
  lo: number,
  hi: number
): "normal" | "borderline" | "abnormal" {
  const margin = (hi - lo) * 0.15
  if (value >= lo && value <= hi) return "normal"
  if (value >= lo - margin && value <= hi + margin) return "borderline"
  return "abnormal"
}

function meridianLabel(s: MeridianStatus): string {
  switch (s) {
    case "aligned": return "On zero meridian (aligned with nasion vertical)"
    case "recessed": return "Recessed behind nasion vertical"
    case "projecting": return "Anterior to nasion vertical (forward projection)"
  }
}

function eLineLabel(s: ELineLipStatus, mm: number): string {
  switch (s) {
    case "behind": return `${mm.toFixed(1)}mm behind E-line (ideal)`
    case "on": return "On E-line"
    case "anterior": return `${Math.abs(mm).toFixed(1)}mm anterior to E-line (protrusion)`
  }
}

export function buildClinicalReport(
  prep: ProfilePrep,
  angles: {
    nasolabial: number
    nasofrontal: number
    gonial: number
    facialConvexity: number
    mentocervical: number
  },
  linear: {
    chinProjectionMm: number
    chinStatus: MeridianStatus
    eLineUpperMm: number
    eLineUpperStatus: ELineLipStatus
    eLineLowerMm: number
    eLineLowerStatus: ELineLipStatus
    maxillaProjectionMm: number
    maxillaStatus: MeridianStatus
  },
  gender: "male" | "female"
): ClinicalReport {
  const I = PROFILE_IDEALS[gender]
  const lm = prep.landmarks

  const anglesTable: AngleReading[] = [
    {
      metric: "Nasolabial Angle",
      value: angles.nasolabial,
      unit: "°",
      norm: I.nasolabial.label,
      status: angleStatus(angles.nasolabial, I.nasolabial.lo, I.nasolabial.hi),
    },
    {
      metric: "Gonial Angle",
      value: angles.gonial,
      unit: "°",
      norm: I.gonial.label,
      status: angleStatus(angles.gonial, I.gonial.lo, I.gonial.hi),
    },
    {
      metric: "Facial Convexity",
      value: angles.facialConvexity,
      unit: "°",
      norm: I.facialConvexity.label,
      status: angleStatus(angles.facialConvexity, I.facialConvexity.lo, I.facialConvexity.hi),
    },
    {
      metric: "Nasofrontal Angle",
      value: angles.nasofrontal,
      unit: "°",
      norm: I.nasofrontal.label,
      status: angleStatus(angles.nasofrontal, I.nasofrontal.lo, I.nasofrontal.hi),
    },
    {
      metric: "Mentocervical Angle",
      value: angles.mentocervical,
      unit: "°",
      norm: I.mentocervical.label,
      status: angleStatus(angles.mentocervical, I.mentocervical.lo, I.mentocervical.hi),
    },
  ]

  const linearTable: LinearReading[] = [
    {
      metric: "Chin (Pg') vs Zero Meridian",
      value: `${linear.chinProjectionMm >= 0 ? "+" : ""}${linear.chinProjectionMm.toFixed(1)}mm`,
      status: meridianLabel(linear.chinStatus),
    },
    {
      metric: "Upper Lip (Ls) vs E-Line",
      value: eLineLabel(linear.eLineUpperStatus, linear.eLineUpperMm),
      status: linear.eLineUpperStatus === "anterior" ? "Possible maxillary lip protrusion" : "Within soft-tissue norm",
    },
    {
      metric: "Lower Lip (Li) vs E-Line",
      value: eLineLabel(linear.eLineLowerStatus, linear.eLineLowerMm),
      status: linear.eLineLowerStatus === "anterior" ? "Possible mandibular lip protrusion" : "Within soft-tissue norm",
    },
    {
      metric: "Maxilla (Sn) vs Zero Meridian",
      value: `${linear.maxillaProjectionMm >= 0 ? "+" : ""}${linear.maxillaProjectionMm.toFixed(1)}mm`,
      status: meridianLabel(linear.maxillaStatus),
    },
  ]

  const maxillaAssessment = assessMaxilla(linear.maxillaStatus, linear.eLineUpperStatus, angles.nasolabial, gender)
  const mandibleAssessment = assessMandible(linear.chinStatus, linear.eLineLowerStatus, angles.gonial, gender)

  const conclusion = [
    `Soft-tissue cephalometric analysis (${gender}, ${prep.side} profile, FHP-corrected).`,
    `Maxilla: ${maxillaAssessment}`,
    `Mandible: ${mandibleAssessment}`,
    `Facial profile convexity ${angles.facialConvexity.toFixed(1)}° (${angleStatus(angles.facialConvexity, I.facialConvexity.lo, I.facialConvexity.hi)} vs Arnett norm ${I.facialConvexity.label}).`,
    linear.chinStatus === "recessed"
      ? "Objective finding: mandibular soft-tissue recession relative to nasion vertical."
      : linear.chinStatus === "projecting"
        ? "Objective finding: mandibular soft-tissue forward projection within/adjacent to Steiner soft-tissue norms."
        : "Objective finding: chin aligned with nasion vertical.",
  ].join(" ")

  const landmarkCoords: Record<string, { x: number; y: number }> = {}
  for (const [key, pt] of Object.entries(prep.annotated)) {
    const label = pt.id.replace(/_/g, " ")
    landmarkCoords[label] = { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100 }
  }

  return {
    angles: anglesTable,
    linear: linearTable,
    conclusion,
    maxillaAssessment,
    mandibleAssessment,
    landmarkCoords,
  }
}

function assessMaxilla(
  meridian: MeridianStatus,
  eLine: ELineLipStatus,
  nasolabial: number,
  gender: "male" | "female"
): string {
  const I = PROFILE_IDEALS[gender]
  const parts: string[] = []
  if (meridian === "recessed") parts.push("maxillary soft tissue recessed relative to zero meridian")
  else if (meridian === "projecting") parts.push("maxillary base projects anterior to nasion vertical")
  else parts.push("maxillary position aligned with nasion vertical")

  if (eLine === "anterior") parts.push("upper lip anterior to Rickett's E-line (soft-tissue maxillary protrusion)")
  if (nasolabial < I.nasolabial.lo) parts.push("acute nasolabial angle suggests reduced midface projection")
  if (nasolabial > I.nasolabial.hi) parts.push("obtuse nasolabial angle suggests excess maxillary length or lip thickness")

  return parts.join("; ") + "."
}

function assessMandible(
  meridian: MeridianStatus,
  eLine: ELineLipStatus,
  gonial: number,
  gender: "male" | "female"
): string {
  const I = PROFILE_IDEALS[gender]
  const parts: string[] = []
  if (meridian === "recessed") parts.push("mandibular soft tissue recessed (retrognathic profile tendency)")
  else if (meridian === "projecting") parts.push("mandibular chin projects forward of nasion vertical")
  else parts.push("mandibular chin on nasion vertical")

  if (eLine === "anterior") parts.push("lower lip crosses E-line (mandibular soft-tissue protrusion)")
  if (gonial < I.gonial.lo) parts.push("low gonial angle — square/horizontal ramus")
  if (gonial > I.gonial.hi) parts.push("high gonial angle — steep mandibular plane tendency")

  return parts.join("; ") + "."
}

export { classifyMeridian, classifyELinePosition }

// lib/side-profile-analysis.ts
// Entry point for lateral profile scanning (Cephalometric Vision Protocol).

import type { Point, FaceResults, BreakdownItem } from "./face-analysis"
import { scoreSideProfile } from "./side-profile-scoring"
import { buildClinicalReport, type ClinicalReport } from "./side-profile-report"
import { prepareSideAnalysis } from "./side-profile-measurements-mp"

export type SideProfileResults = FaceResults & {
  clinicalReport: ClinicalReport
  scanType: "profile"
  fhpTiltDeg: number
}

export function calculateSideScores(
  positions: Point[],
  gender: "male" | "female",
  yawDeg?: number
): SideProfileResults {
  const prep = prepareSideAnalysis(positions, yawDeg ?? 70)
  const base = scoreSideProfile(positions, gender, yawDeg, prep)
  const g = prep.geometry

  const clinicalReport = buildClinicalReport(
    prep,
    {
      nasolabial: g.nasolabial,
      nasofrontal: g.nasofrontal,
      gonial: g.gonial,
      facialConvexity: g.facialConvexity,
      mentocervical: g.mentocervical,
    },
    {
      chinProjectionMm: g.chinProjectionMm,
      chinStatus: g.chinStatus,
      eLineUpperMm: g.eLineUpperMm,
      eLineUpperStatus: g.eLineUpperStatus,
      eLineLowerMm: g.eLineLowerMm,
      eLineLowerStatus: g.eLineLowerStatus,
      maxillaProjectionMm: g.maxillaProjectionMm,
      maxillaStatus: g.maxillaStatus,
    },
    gender
  )

  return { ...base, clinicalReport, scanType: "profile", fhpTiltDeg: prep.fhpTiltDeg }
}

export type { FaceResults, BreakdownItem, ClinicalReport }

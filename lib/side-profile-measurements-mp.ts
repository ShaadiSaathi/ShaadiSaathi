// lib/side-profile-measurements-mp.ts
// Coordinate-based lateral cephalometric analysis (Cephalometric Vision Protocol).
// Landmarks → FHP orientation → geometric angles/projections. No visual estimation.

import type { Point } from "./face-analysis"
import { PROFILE_IDEALS } from "./profile-ideals"
import type { ProfileSide } from "./face-pose-profile-mp"
import { detectProfileSide } from "./face-pose-profile-mp"
import { MP } from "./mediapipe-landmarks"
import {
  angleAtVertex,
  classifyELinePosition,
  classifyMeridian,
  dist,
  facialConvexityAngle,
  gonialAngle,
  nasofrontalAngle,
  nasolabialAngle,
  normalizeToFHP,
  signedPerpendicularDistance,
  zeroMeridianProjection,
  type ELineLipStatus,
  type MeridianStatus,
} from "./cephalometric-geometry"
import {
  makeLandmark,
  type AnnotatedProfileLandmarks,
} from "./anthropometry/landmark-registry"
import { validateProfileLandmarks } from "./anthropometry/landmark-validation"
import {
  applyAnatomicalAgreement,
  detectProportionOutliers,
  type OutlierFlag,
} from "./anthropometry/outlier-detection"
import {
  poseConfidenceFactor,
  estimatePoseFromLandmarks,
} from "./anthropometry/pipeline"
import {
  assessImageQuality,
  estimateFaceBBoxHeight,
} from "./anthropometry/image-quality"
import { propagateConfidence } from "./anthropometry/types"

const vertDist = (a: Point, b: Point) => Math.abs(a.y - b.y)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export const PROFILE_CONFIDENCE_THRESHOLD = 0.32

export type ProfileLandmarks = {
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
  gonion: Point
  orbitale: Point
  porion: Point
  condylion: Point
}

export type ProfileGeometry = {
  nasolabial: number
  nasofrontal: number
  gonial: number
  facialConvexity: number
  mentocervical: number
  mandibularPlane: number
  chinProjectionMm: number
  chinStatus: MeridianStatus
  maxillaProjectionMm: number
  maxillaStatus: MeridianStatus
  eLineUpperMm: number
  eLineUpperStatus: ELineLipStatus
  eLineLowerMm: number
  eLineLowerStatus: ELineLipStatus
}

export type ProfilePrep = {
  rawLandmarks: Point[]
  normalized: Point[]
  side: ProfileSide
  yawDeg: number
  landmarks: ProfileLandmarks
  annotated: AnnotatedProfileLandmarks
  faceHeight: number
  mmPerUnit: number
  geometry: ProfileGeometry
  fhpTiltDeg: number
  resolutionFactor: number
  outlierFlags: OutlierFlag[]
}

export type RawMetric = {
  key: string
  value: number | null
  confidence: number
  reason: string
  unreliable: boolean
}

function anteriorIsPositiveX(side: ProfileSide): boolean {
  return side === "left"
}

/** E-line interior side: lips should sit behind Prn→Pg' toward face interior. */
function eLineInteriorSign(side: ProfileSide): 1 | -1 {
  return side === "left" ? 1 : -1
}

function estimateCervical(menton: Point, gonion: Point, faceH: number): Point {
  const dx = menton.x - gonion.x
  const dy = menton.y - gonion.y
  const len = Math.hypot(dx, dy) || 1
  return {
    x: menton.x + (dx / len) * faceH * 0.12,
    y: menton.y + faceH * 0.22,
  }
}

function extractProfileLandmarks(p: Point[], side: ProfileSide): ProfileLandmarks {
  const get = (i: number): Point => p[i] ?? { x: 0, y: 0 }
  const nasion = get(MP.nasion)
  const menton = get(MP.menton)
  const faceH = vertDist(nasion, menton) || 1

  const gonion = side === "left" ? get(MP.gonionLeft) : get(MP.gonionRight)
  const porion = side === "left"
    ? { x: get(234).x, y: (get(234).y + gonion.y) / 2 - faceH * 0.04 }
    : { x: get(454).x, y: (get(454).y + gonion.y) / 2 - faceH * 0.04 }

  const condylion = { x: porion.x, y: porion.y - faceH * 0.02 }

  const col = get(164)
  const noseTip = get(MP.noseTip)
  const columella = {
    x: noseTip.x * 0.35 + col.x * 0.65,
    y: noseTip.y * 0.35 + col.y * 0.65,
  }

  const upperLip = side === "left"
    ? { x: Math.max(get(13).x, get(14).x), y: (get(13).y + get(14).y) / 2 }
    : { x: Math.min(get(13).x, get(14).x), y: (get(13).y + get(14).y) / 2 }

  const lowerLip = side === "left"
    ? { x: Math.max(get(17).x, get(18).x), y: (get(17).y + get(18).y) / 2 }
    : { x: Math.min(get(17).x, get(18).x), y: (get(17).y + get(18).y) / 2 }

  const pogonion = {
    x: side === "left"
      ? Math.max(menton.x, get(152).x, get(17).x, get(18).x)
      : Math.min(menton.x, get(152).x, get(17).x, get(18).x),
    y: menton.y,
  }

  return {
    glabella: get(MP.glabella),
    nasion,
    pronasale: noseTip,
    columella,
    subnasale: {
      x: noseTip.x * 0.25 + col.x * 0.5 + upperLip.x * 0.25,
      y: noseTip.y * 0.2 + col.y * 0.5 + upperLip.y * 0.3,
    },
    upperLip,
    lowerLip,
    pogonion,
    menton,
    cervical: estimateCervical(menton, gonion, faceH),
    gonion,
    orbitale: side === "left" ? get(MP.leftLowerLid) : get(MP.rightLowerLid),
    porion,
    condylion,
  }
}

function annotateLandmarks(
  lm: ProfileLandmarks,
  poseFactor: number,
  resolutionFactor: number
): { annotated: AnnotatedProfileLandmarks; outlierFlags: OutlierFlag[] } {
  const draft: AnnotatedProfileLandmarks = {
    glabella: makeLandmark("glabella", lm.glabella.x, lm.glabella.y, { poseFactor, resolutionFactor }),
    nasion: makeLandmark("nasion", lm.nasion.x, lm.nasion.y, { poseFactor, resolutionFactor }),
    pronasale: makeLandmark("pronasale", lm.pronasale.x, lm.pronasale.y, { poseFactor, resolutionFactor }),
    columella: makeLandmark("columella", lm.columella.x, lm.columella.y, { poseFactor, resolutionFactor }),
    subnasale: makeLandmark("subnasale", lm.subnasale.x, lm.subnasale.y, { poseFactor, resolutionFactor }),
    upperLip: makeLandmark("upperLip", lm.upperLip.x, lm.upperLip.y, { poseFactor, resolutionFactor }),
    lowerLip: makeLandmark("lowerLip", lm.lowerLip.x, lm.lowerLip.y, { poseFactor, resolutionFactor }),
    pogonion: makeLandmark("pogonion", lm.pogonion.x, lm.pogonion.y, { poseFactor, resolutionFactor }),
    menton: makeLandmark("menton", lm.menton.x, lm.menton.y, { poseFactor, resolutionFactor }),
    cervical: makeLandmark("cervical", lm.cervical.x, lm.cervical.y, { poseFactor, resolutionFactor }),
    gonion: makeLandmark("gonion", lm.gonion.x, lm.gonion.y, { poseFactor, resolutionFactor }),
    orbitale: makeLandmark("orbitale", lm.orbitale.x, lm.orbitale.y, { poseFactor, resolutionFactor }),
    porion: makeLandmark("porion", lm.porion.x, lm.porion.y, { poseFactor, resolutionFactor }),
    condylion: makeLandmark("condylion", lm.condylion.x, lm.condylion.y, { poseFactor, resolutionFactor }),
  }

  const agreement = applyAnatomicalAgreement(draft)
  for (const key of Object.keys(draft) as (keyof AnnotatedProfileLandmarks)[]) {
    draft[key].confidence = Math.min(
      0.99,
      draft[key].confidence * (0.85 + agreement * 0.15)
    )
  }

  const outlierFlags = detectProportionOutliers(draft)
  return { annotated: draft, outlierFlags }
}

function computeGeometry(lm: ProfileLandmarks, side: ProfileSide, mmPerUnit: number): ProfileGeometry {
  const antPos = anteriorIsPositiveX(side)
  const eSign = eLineInteriorSign(side)

  const chinProjectionMm = zeroMeridianProjection(lm.nasion, lm.pogonion, mmPerUnit, antPos)
  const maxillaProjectionMm = zeroMeridianProjection(lm.nasion, lm.subnasale, mmPerUnit, antPos)

  const eUpperSigned = signedPerpendicularDistance(lm.upperLip, lm.pronasale, lm.pogonion, eSign) * mmPerUnit
  const eLowerSigned = signedPerpendicularDistance(lm.lowerLip, lm.pronasale, lm.pogonion, eSign) * mmPerUnit

  const mpAngle = Math.abs(
    Math.atan2(lm.gonion.y - lm.condylion.y, lm.gonion.x - lm.condylion.x) * (180 / Math.PI) -
    Math.atan2(lm.menton.y - lm.nasion.y, lm.menton.x - lm.nasion.x) * (180 / Math.PI)
  )

  return {
    nasolabial: nasolabialAngle(lm.columella, lm.subnasale, lm.upperLip),
    nasofrontal: nasofrontalAngle(lm.glabella, lm.nasion, lm.pronasale),
    gonial: gonialAngle(lm.condylion, lm.gonion, lm.menton),
    facialConvexity: facialConvexityAngle(lm.glabella, lm.subnasale, lm.pogonion),
    mentocervical: angleAtVertex(lm.pogonion, lm.menton, lm.cervical),
    mandibularPlane: mpAngle,
    chinProjectionMm,
    chinStatus: classifyMeridian(chinProjectionMm),
    maxillaProjectionMm,
    maxillaStatus: classifyMeridian(maxillaProjectionMm),
    eLineUpperMm: eUpperSigned,
    eLineUpperStatus: classifyELinePosition(eUpperSigned),
    eLineLowerMm: eLowerSigned,
    eLineLowerStatus: classifyELinePosition(eLowerSigned),
  }
}

export function prepareSideAnalysis(
  pixelLms: Point[],
  yawDeg = 70,
  imageSize?: { width: number; height: number },
  extraPoseFactor = 1
): ProfilePrep {
  const rawLandmarks = pixelLms.map(pt => ({ ...pt }))
  const side = detectProfileSide(pixelLms)
  const pose = estimatePoseFromLandmarks(pixelLms)
  const poseFactor = poseConfidenceFactor(pose, true) * extraPoseFactor
  let resolutionFactor = 0.9

  if (imageSize) {
    const assessment = assessImageQuality({
      width: imageSize.width,
      height: imageSize.height,
      faceBBoxHeight: estimateFaceBBoxHeight(pixelLms),
    })
    if (assessment.accept) {
      resolutionFactor = assessment.imageQualityFactor
    }
  }

  const orbitaleRaw = side === "left" ? pixelLms[MP.leftLowerLid] : pixelLms[MP.rightLowerLid]
  const gonionRaw = side === "left" ? pixelLms[MP.gonionLeft] : pixelLms[MP.gonionRight]
  const tragusRaw = side === "left"
    ? { x: pixelLms[234].x, y: (pixelLms[234].y + gonionRaw.y) / 2 - vertDist(pixelLms[168], pixelLms[152]) * 0.04 }
    : { x: pixelLms[454].x, y: (pixelLms[454].y + gonionRaw.y) / 2 - vertDist(pixelLms[168], pixelLms[152]) * 0.04 }

  const { normalized, frame } = normalizeToFHP(pixelLms, tragusRaw, orbitaleRaw)
  const landmarks = extractProfileLandmarks(normalized, side)
  const { annotated, outlierFlags } = annotateLandmarks(landmarks, poseFactor, resolutionFactor)
  const faceHeight = vertDist(landmarks.nasion, landmarks.menton) || 1
  const mmPerUnit = 120 / faceHeight
  const geometry = computeGeometry(landmarks, side, mmPerUnit)

  return {
    rawLandmarks,
    normalized,
    side,
    yawDeg,
    landmarks,
    annotated,
    faceHeight,
    mmPerUnit,
    geometry,
    fhpTiltDeg: frame.fhpTiltRad * (180 / Math.PI),
    resolutionFactor,
    outlierFlags,
  }
}

/** Manual §1.8 — image quality before landmark work. */
/** Ch.1 v1.1 — catastrophic checks only; otherwise flag via confidence. */
export function validateProfileImageQuality(
  pixelLms: Point[],
  imageWidth: number,
  imageHeight: number
): { ok: true; imageQualityFactor: number; flags: string[] } | { ok: false; message: string } {
  const assessment = assessImageQuality({
    width: imageWidth,
    height: imageHeight,
    faceBBoxHeight: estimateFaceBBoxHeight(pixelLms),
  })
  if (!assessment.accept) return { ok: false, message: assessment.message ?? "Image quality insufficient." }
  return { ok: true, imageQualityFactor: assessment.imageQualityFactor, flags: assessment.flags }
}

export function validateSideImageQuality(
  prep: ProfilePrep
): { ok: true } | { ok: false; message: string } {
  const faceH = prep.faceHeight
  if (faceH < 18) {
    return { ok: false, message: "Face not visible enough — chin or nose appears cropped from the image." }
  }
  const lmCheck = validateProfileLandmarks(prep.annotated, prep.side)
  if (!lmCheck.ok) return { ok: false, message: lmCheck.message }
  return { ok: true }
}

export function computeSideMetrics(prep: ProfilePrep): RawMetric[] {
  const { landmarks: lm, faceHeight: fh, geometry: g, annotated: ann } = prep
  const metrics: RawMetric[] = []

  const push = (
    key: string,
    value: number,
    landmarkIds: (keyof AnnotatedProfileLandmarks)[],
    reason: string,
    unreliable = false,
    measureFactor = 0.98
  ) => {
    const conf = propagateConfidence(
      landmarkIds.map(id => ann[id].confidence),
      measureFactor
    )
    metrics.push({
      key,
      value,
      confidence: conf,
      reason,
      unreliable: unreliable || conf < PROFILE_CONFIDENCE_THRESHOLD,
    })
  }

  push("nasolabial", g.nasolabial, ["columella", "subnasale", "upperLip"],
    "Sn vertex: Cm→Sn→Ls (Type B/C landmarks)", false)
  push("nasofrontal", g.nasofrontal, ["glabella", "nasion", "pronasale"],
    "G→N'→Prn (Type A landmarks)", false)
  push("gonial", g.gonial, ["condylion", "gonion", "menton"],
    "Go' vertex: ramus vs body (Type D skeletal estimates)", prep.yawDeg < 65, 0.92)
  push("mandibularPlane", g.mandibularPlane, ["condylion", "gonion", "nasion", "menton"],
    "Mandibular plane steepness", prep.yawDeg < 65, 0.90)
  push("mentocervical", g.mentocervical, ["pogonion", "menton", "cervical"],
    "Pg'→Me'→cervical", prep.yawDeg < 65, 0.88)
  push("facialConvexity", g.facialConvexity, ["glabella", "subnasale", "pogonion"],
    "G→Sn→Pg' convexity", false)
  push("chinProjection", g.chinProjectionMm, ["nasion", "pogonion"],
    `Zero meridian: Pg' vs N' (${g.chinStatus})`, false)
  push("eLineUpper", Math.abs(g.eLineUpperMm), ["pronasale", "pogonion", "upperLip"],
    `E-line upper lip: ${g.eLineUpperStatus}`, false)
  push("eLineLower", Math.abs(g.eLineLowerMm), ["pronasale", "pogonion", "lowerLip"],
    `E-line lower lip: ${g.eLineLowerStatus}`, false)

  const upperSeg = vertDist(lm.subnasale, lm.upperLip)
  const lowerSeg = vertDist(lm.upperLip, lm.menton)
  push("lowerFaceThirds", upperSeg / (lowerSeg || 1), ["subnasale", "upperLip", "menton"],
    "Sn→Ls / Ls→Me' ratio (ideal ~0.5)", false)

  const nasalVert = vertDist(lm.nasion, lm.subnasale) || 1
  push("nasalProjection", dist(lm.pronasale, lm.subnasale) / nasalVert,
    ["pronasale", "subnasale", "nasion"], "Baum ratio", false)
  push("mandibularBody", dist(lm.gonion, lm.menton) / fh,
    ["gonion", "menton"], "Go'→Me' / face height", prep.yawDeg < 65, 0.90)
  push("ramusHeight", dist(lm.condylion, lm.gonion) / fh,
    ["condylion", "gonion"], "Condylion→Go' / face height", prep.yawDeg < 65, 0.88)
  push("upperLipThickness", vertDist(lm.subnasale, lm.upperLip) / fh,
    ["subnasale", "upperLip"], "Upper lip height / face height", false)
  push("lowerLipThickness", vertDist(lm.upperLip, lm.lowerLip) / fh,
    ["upperLip", "lowerLip"], "Lower lip height / face height", false)

  return metrics
}

export function metricMap(metrics: RawMetric[]): Map<string, RawMetric> {
  return new Map(metrics.map(m => [m.key, m]))
}

export function getProfileIdealLabel(key: string, gender: "male" | "female"): string {
  const I = PROFILE_IDEALS[gender]
  const k = key as keyof typeof I
  return I[k]?.label ?? "—"
}

// lib/front-face-measurements-mp.ts
// Front-face anatomical measurements using MediaPipe 478-point landmarks.

import type { Point } from "./face-analysis"
import { FRONT_IDEALS } from "./facial-ideals"
import { extractMPLandmarks, type MPLandmarks } from "./mediapipe-landmarks"
import { frontalPoseQualityFactor, shouldRejectFrontPose } from "./anthropometry/image-quality"

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const vertDist = (a: Point, b: Point) => Math.abs(a.y - b.y)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export const CONFIDENCE_THRESHOLD = 0.45

export type HeadPose = { yawDeg: number; pitchDeg: number; rollDeg: number }
export type MouthOpeningClass = "closed" | "slight" | "medium" | "large"

export type MouthAnalysis = {
  openingClass: MouthOpeningClass
  openingRatio: number
  smileLikely: boolean
  cornersNeutral: boolean
  virtualStomion: Point
  lipConfidenceFactor: number
  lipEstimated: boolean
}

export type RawMetric = {
  key: string
  value: number | null
  confidence: number
  reason: string
  unreliable: boolean
}

export type FrontPrep = {
  normalized: Point[]
  pose: HeadPose
  landmarks: MPLandmarks
  mouth: MouthAnalysis
}

function estimateHeadPose(p: Point[]): HeadPose {
  const lp = p[468] ?? p[133]
  const rp = p[473] ?? p[362]
  const rollDeg = Math.atan2(rp.y - lp.y, rp.x - lp.x) * (180 / Math.PI)
  const midX = (p[234].x + p[454].x) / 2
  const faceW = Math.abs(p[454].x - p[234].x) || 1
  const yawRatio = (p[4].x - midX) / faceW
  const yawDeg = Math.atan(yawRatio * 2.2) * (180 / Math.PI)
  const noseLen = dist(p[168], p[2])
  const pitchDeg = ((noseLen / (faceW * 0.26)) - 1) * 25
  return {
    yawDeg: clamp(yawDeg, -45, 45),
    pitchDeg: clamp(pitchDeg, -35, 35),
    rollDeg: clamp(rollDeg, -25, 25),
  }
}

function normalizeRoll(p: Point[]): { normalized: Point[]; rollDeg: number } {
  const lp = p[468] ?? p[133]
  const rp = p[473] ?? p[362]
  const roll = Math.atan2(rp.y - lp.y, rp.x - lp.x)
  const rollDeg = roll * (180 / Math.PI)
  if (Math.abs(rollDeg) < 0.3) return { normalized: p.map(pt => ({ ...pt })), rollDeg }
  const cx = (lp.x + rp.x) / 2
  const cy = (lp.y + rp.y) / 2
  const cos = Math.cos(-roll)
  const sin = Math.sin(-roll)
  return {
    normalized: p.map(pt => {
      const dx = pt.x - cx
      const dy = pt.y - cy
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
    }),
    rollDeg,
  }
}

function analyzeMouth(p: Point[]): MouthAnalysis {
  const upperV = p[13]
  const lowerV = p[14]
  const leftC = p[61]
  const rightC = p[291]
  const mouthW = dist(leftC, rightC) || 1
  const openingH = vertDist(upperV, lowerV)
  const openingRatio = openingH / mouthW
  const chelionY = (leftC.y + rightC.y) / 2
  const faceW = dist(p[234], p[454]) || 1
  const blend = clamp(openingRatio / 0.38, 0, 1)
  const rawMidY = (upperV.y + lowerV.y) / 2
  const virtualStomion: Point = {
    x: (upperV.x + lowerV.x) / 2,
    y: rawMidY * (1 - blend * 0.5) + chelionY * (blend * 0.5),
  }
  const smileLikely = (virtualStomion.y - chelionY) > faceW * 0.015 && openingRatio > 0.06
  const cornersNeutral = (virtualStomion.y - chelionY) < faceW * 0.012

  let openingClass: MouthOpeningClass
  if (openingRatio < 0.08) openingClass = "closed"
  else if (openingRatio < 0.20) openingClass = "slight"
  else if (openingRatio < 0.38) openingClass = "medium"
  else openingClass = "large"

  let lipConfidenceFactor = 1
  let lipEstimated = false
  switch (openingClass) {
    case "closed": break
    case "slight": lipConfidenceFactor = smileLikely ? 0.88 : 0.93; break
    case "medium": lipConfidenceFactor = smileLikely ? 0.68 : 0.76; lipEstimated = true; break
    case "large": lipConfidenceFactor = smileLikely ? 0.32 : 0.42; lipEstimated = true; break
  }

  return { openingClass, openingRatio, smileLikely, cornersNeutral, virtualStomion, lipConfidenceFactor, lipEstimated }
}

export function prepareFrontAnalysis(pixelLms: Point[]): FrontPrep {
  const { normalized, rollDeg } = normalizeRoll(pixelLms)
  const pose = estimateHeadPose(normalized)
  pose.rollDeg = rollDeg
  const mouth = analyzeMouth(normalized)
  const landmarks = extractMPLandmarks(normalized)
  landmarks.stomion = mouth.virtualStomion
  return { normalized, pose, landmarks, mouth }
}

export function validateFrontImageQuality(
  prep: FrontPrep,
  _imageSize?: { w: number; h: number }
): { ok: true; poseFactor: number } | { ok: false; message: string } {
  const { pose } = prep
  const reject = shouldRejectFrontPose(pose.yawDeg, pose.pitchDeg, pose.rollDeg)
  if (reject) return { ok: false, message: reject }
  return { ok: true, poseFactor: frontalPoseQualityFactor(pose.yawDeg, pose.pitchDeg, pose.rollDeg) }
}

function canthalTilt(inner: Point, outer: Point): number {
  return Math.atan2(inner.y - outer.y, Math.abs(outer.x - inner.x)) * (180 / Math.PI)
}

function angleAtVertex(A: Point, V: Point, B: Point): number {
  const va = { x: A.x - V.x, y: A.y - V.y }
  const vb = { x: B.x - V.x, y: B.y - V.y }
  const dot = va.x * vb.x + va.y * vb.y
  const mag = Math.hypot(va.x, va.y) * Math.hypot(vb.x, vb.y)
  if (mag === 0) return 0
  return Math.acos(clamp(dot / mag, -1, 1)) * (180 / Math.PI)
}

export function computeFrontMetrics(prep: FrontPrep): RawMetric[] {
  const { normalized: p, landmarks: lm, pose, mouth } = prep
  const metrics: RawMetric[] = []

  const poseConf = clamp(
    frontalPoseQualityFactor(pose.yawDeg, pose.pitchDeg, pose.rollDeg) *
    (1 - (Math.abs(pose.yawDeg) / 25) * 0.15),
    0.4, 1
  )
  const lipConf = (base: number) => clamp(poseConf * base * mouth.lipConfidenceFactor, 0.22, 0.94)
  const lipUnreliable = mouth.openingClass === "large"

  const bizygomatic = dist(lm.leftZygion, lm.rightZygion)
  const bigonial = dist(lm.leftGonion, lm.rightGonion)

  // FWHR
  const browTop = { x: (lm.leftBrowInner.x + lm.rightBrowInner.x) / 2, y: (lm.leftBrowInner.y + lm.rightBrowInner.y) / 2 }
  const upperFaceH = vertDist(browTop, lm.upperLipTop) || 1
  metrics.push({ key: "fwhr", value: bizygomatic / upperFaceH, confidence: clamp(poseConf * 0.95, 0.6, 0.99), reason: "Bizygomatic / brow-inner to upper-lip", unreliable: false })

  // Lower / full face
  const trichionToMenton = vertDist(lm.trichion, lm.menton)
  const subnasaleToMenton = vertDist(lm.subnasale, lm.menton)
  metrics.push({ key: "lowerFull", value: subnasaleToMenton / (trichionToMenton || 1), confidence: clamp(poseConf * 0.92, 0.55, 0.97), reason: "Subnasale→menton / trichion→menton", unreliable: false })

  // Midface
  const nasionToSubnasale = vertDist(lm.nasion, lm.subnasale) || 1
  const nasionToMenton = vertDist(lm.nasion, lm.menton) || 1
  metrics.push({ key: "midface", value: nasionToSubnasale / nasionToMenton, confidence: clamp(poseConf * 0.93, 0.6, 0.98), reason: "Nasion→subnasale / nasion→menton", unreliable: false })

  // Mouth-nose
  metrics.push({ key: "mouthNose", value: dist(lm.leftChelion, lm.rightChelion) / (dist(lm.alarLeft, lm.alarRight) || 1), confidence: clamp(poseConf * 0.93, 0.6, 0.98), reason: "Chelion–chelion / alar–alar", unreliable: false })

  // Lip ratio
  const upperLipH = vertDist(lm.subnasale, lm.stomion) || 1
  const lowerLipH = vertDist(lm.stomion, lm.lowerLipBottom)
  metrics.push({ key: "lipRatio", value: lowerLipH / upperLipH, confidence: lipConf(0.90), reason: "Lower/upper lip height via virtual stomion", unreliable: lipUnreliable })

  // Chin-philtrum
  metrics.push({ key: "chinPhiltrum", value: vertDist(lm.stomion, lm.menton) / (vertDist(lm.subnasale, lm.stomion) || 1), confidence: lipConf(0.91), reason: "Stomion→menton / subnasale→stomion", unreliable: lipUnreliable })

  // Cheekbone-jaw
  metrics.push({ key: "cbJaw", value: bizygomatic / (bigonial || 1), confidence: clamp(poseConf * 0.90, 0.55, 0.96), reason: "True bizygomatic / true bigonial", unreliable: false })

  // Eye spacing
  const leftEyeW = dist(lm.leftInnerCanthus, lm.leftOuterCanthus)
  const rightEyeW = dist(lm.rightInnerCanthus, lm.rightOuterCanthus)
  const avgEyeW = (leftEyeW + rightEyeW) / 2
  const intercanthal = dist(lm.leftInnerCanthus, lm.rightInnerCanthus)
  metrics.push({ key: "eyeSpacing", value: intercanthal / (avgEyeW || 1), confidence: clamp(poseConf * 0.96, 0.65, 0.99), reason: "Intercanthal / mean eye width", unreliable: false })

  // Eye aspect ratio
  const leftEyeH = dist(lm.leftUpperLid, lm.leftLowerLid)
  const rightEyeH = dist(lm.rightUpperLid, lm.rightLowerLid)
  const avgEyeH = (leftEyeH + rightEyeH) / 2
  metrics.push({ key: "ear", value: avgEyeW / (avgEyeH || 1), confidence: clamp(poseConf * 0.94, 0.6, 0.98), reason: "Mean eye width / mean palpebral height", unreliable: false })

  // EME angle
  metrics.push({ key: "eme", value: angleAtVertex(lm.leftPupil, lm.stomion, lm.rightPupil), confidence: lipConf(0.87), reason: "Pupil–stomion–pupil angle", unreliable: lipUnreliable })

  // Canthal tilt
  const tiltL = canthalTilt(lm.leftInnerCanthus, lm.leftOuterCanthus)
  const tiltR = canthalTilt(lm.rightInnerCanthus, lm.rightOuterCanthus)
  metrics.push({ key: "canthal", value: (tiltL + tiltR) / 2, confidence: clamp(poseConf * 0.95, 0.65, 0.99), reason: "Canthal tilt both eyes averaged", unreliable: false })

  // Gonial (N/A front)
  metrics.push({ key: "gonial", value: null, confidence: 0.18, reason: "Gonial angle requires side profile", unreliable: true })

  // Symmetry
  const midX = (lm.leftZygion.x + lm.rightZygion.x) / 2
  const symPairs: [number, number][] = [[33, 263], [133, 362], [129, 358], [61, 291], [234, 454], [172, 397], [70, 300], [105, 334], [159, 386]]
  const meanDev = symPairs.map(([l, r]) => Math.abs(Math.abs(p[l].x - midX) - Math.abs(p[r].x - midX)) / (bizygomatic || 1)).reduce((s, d) => s + d, 0) / symPairs.length
  metrics.push({ key: "symmetry", value: meanDev, confidence: clamp(poseConf * 0.90, 0.55, 0.97), reason: "Lateral asymmetry across 9 paired landmarks", unreliable: false })

  // Facial thirds
  const upper = vertDist(lm.trichion, lm.glabella)
  const middle = vertDist(lm.glabella, lm.subnasale)
  const lower = vertDist(lm.subnasale, lm.menton)
  const total = upper + middle + lower || 1
  metrics.push({ key: "thirdsUpper", value: upper / total, confidence: clamp(poseConf * 0.93, 0.6, 0.97), reason: "Trichion→glabella", unreliable: false })
  metrics.push({ key: "thirdsMiddle", value: middle / total, confidence: clamp(poseConf * 0.95, 0.65, 0.98), reason: "Glabella→subnasale", unreliable: false })
  metrics.push({ key: "thirdsLower", value: lower / total, confidence: clamp(poseConf * 0.95, 0.65, 0.98), reason: "Subnasale→menton", unreliable: false })

  // Facial fifths
  const fifth = bizygomatic / 5
  const segs = [dist(p[234], p[33]), dist(p[33], p[133]), intercanthal, dist(p[362], p[263]), dist(p[263], p[454])]
  const maxDev5 = Math.max(...segs.map(s => Math.abs(s - fifth) / (fifth || 1)))
  metrics.push({ key: "fifths", value: maxDev5, confidence: clamp(poseConf * 0.90, 0.55, 0.96), reason: "Max deviation from equal fifths", unreliable: false })

  // Cervicomental (N/A)
  metrics.push({ key: "cervicomental", value: null, confidence: 0, reason: "Requires profile view", unreliable: true })

  // Face length : width
  metrics.push({ key: "flw", value: vertDist(lm.trichion, lm.menton) / (bizygomatic || 1), confidence: clamp(poseConf * 0.92, 0.6, 0.97), reason: "Trichion→menton / bizygomatic", unreliable: false })

  // Thirds ratio
  metrics.push({ key: "thirdsRatio", value: middle / (lower || 1), confidence: clamp(poseConf * 0.92, 0.6, 0.97), reason: "Midface height / lower face height", unreliable: false })

  return metrics
}

export function metricMap(metrics: RawMetric[]): Map<string, RawMetric> {
  return new Map(metrics.map(m => [m.key, m]))
}

export function getIdealLabel(key: string, gender: "male" | "female"): string {
  const I = FRONT_IDEALS[gender]
  const map: Record<string, string> = {
    fwhr: I.fwhr.label, lowerFull: I.lowerFaceRatio.label, midface: I.midfaceRatio.label,
    mouthNose: I.mouthNose.label, lipRatio: I.lipRatio.label, chinPhiltrum: I.chinPhiltrum.label,
    cbJaw: I.bzygBigonial.label, eyeSpacing: I.eyeSpacing.label, ear: I.palpebralFissure.label,
    eme: "47°–50°", canthal: I.canthalTilt.label, gonial: I.gonialAngle.label + " (profile only)",
    symmetry: "100%", thirdsRatio: I.facialThirds.label, fifths: "Equal ⅕s",
    cervicomental: I.mentocervical.label + " (profile only)", flw: I.faceLengthWidth.label,
    thirdsUpper: "⅓", thirdsMiddle: "⅓", thirdsLower: "⅓",
  }
  return map[key] ?? "—"
}

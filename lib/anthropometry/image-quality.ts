// lib/anthropometry/image-quality.ts
// Manual Ch.1 v1.1 §1.8–§1.11 — lenient acceptance; reject only when unreliable.

import type { ImageQualityInput, QualityResult } from "./types"

/** ~720p: short edge ≥ 720; we use long-edge floor for aspect-agnostic checks */
const HARD_REJECT_LONG_EDGE = 200
const PREFERRED_LONG_EDGE = 1280
const IDEAL_LONG_EDGE = 2160
const HARD_REJECT_FACE_RATIO = 0.06
const WARN_FACE_RATIO = 0.12

export type ImageQualityAssessment = {
  accept: boolean
  message?: string
  imageQualityFactor: number
  flags: string[]
}

export function assessImageQuality(input: ImageQualityInput): ImageQualityAssessment {
  const { width, height, faceBBoxHeight } = input
  const longEdge = Math.max(width, height)
  const shortEdge = Math.min(width, height)
  const faceRatio = faceBBoxHeight / (height || 1)
  const flags: string[] = []
  let factor = 1.0

  if (longEdge < HARD_REJECT_LONG_EDGE) {
    return {
      accept: false,
      message: "Image resolution too low — facial contour cannot be identified reliably.",
      imageQualityFactor: 0,
      flags: ["resolution_critical"],
    }
  }

  if (faceRatio < HARD_REJECT_FACE_RATIO) {
    return {
      accept: false,
      message: "Face not visible enough in frame — ensure nose and chin are included.",
      imageQualityFactor: 0,
      flags: ["face_cropped"],
    }
  }

  factor *= resolutionConfidenceFactor(longEdge)

  if (shortEdge < 720) {
    flags.push("below_720p")
    factor *= 0.88
  } else if (shortEdge < 1080) {
    flags.push("720p_acceptable")
  } else {
    flags.push("hd_preferred")
  }

  if (faceRatio < WARN_FACE_RATIO) {
    flags.push("face_small_in_frame")
    factor *= 0.9
  }

  return {
    accept: true,
    imageQualityFactor: Math.max(0.35, Math.min(1, factor)),
    flags,
  }
}

/** Hard reject only for catastrophic quality (§1.8). */
export function validateImageQuality(input: ImageQualityInput): QualityResult {
  const assessment = assessImageQuality(input)
  if (!assessment.accept) {
    return { ok: false, stage: "quality", message: assessment.message ?? "Image quality insufficient." }
  }
  return { ok: true }
}

export function resolutionConfidenceFactor(longEdge: number): number {
  if (longEdge >= IDEAL_LONG_EDGE) return 1.0
  if (longEdge >= PREFERRED_LONG_EDGE) return 0.96
  if (longEdge >= 720) return 0.9
  if (longEdge >= 480) return 0.82
  return 0.72
}

export function estimateFaceBBoxHeight(landmarks: { y: number }[]): number {
  if (landmarks.length === 0) return 0
  const ys = landmarks.map(l => l.y)
  return Math.max(...ys) - Math.min(...ys)
}

/** §1.8 — degrade confidence for pose instead of rejecting (frontal). */
export function frontalPoseQualityFactor(yawDeg: number, pitchDeg: number, rollDeg: number): number {
  let f = 1.0
  const yaw = Math.abs(yawDeg)
  const pitch = Math.abs(pitchDeg)
  const roll = Math.abs(rollDeg)

  if (yaw > 15) f *= Math.max(0.55, 1 - (yaw - 15) / 50)
  if (pitch > 20) f *= Math.max(0.6, 1 - (pitch - 20) / 45)
  if (roll > 15) f *= Math.max(0.65, 1 - (roll - 15) / 40)

  return Math.max(0.35, f)
}

/** Profile pose quality factor — accept oblique profiles with lower confidence. */
export function profilePoseQualityFactor(yawDeg: number, rollDeg: number): number {
  let f = 1.0
  if (yawDeg < 30) f *= Math.max(0.5, yawDeg / 30)
  if (yawDeg > 100) f *= Math.max(0.6, 1 - (yawDeg - 100) / 40)
  if (rollDeg > 20) f *= Math.max(0.6, 1 - (rollDeg - 20) / 35)
  return Math.max(0.35, f)
}

export function shouldRejectFrontPose(yawDeg: number, pitchDeg: number, rollDeg: number): string | null {
  if (Math.abs(yawDeg) > 42) return "Head turned too far — facial contour not reliably measurable."
  if (Math.abs(pitchDeg) > 45) return "Extreme head tilt — chin or forehead not reliably visible."
  if (Math.abs(rollDeg) > 38) return "Extreme head roll — landmarks cannot be oriented reliably."
  return null
}

export function shouldRejectProfilePose(yawDeg: number, rollDeg: number, eyeRatio: number): string | null {
  if (yawDeg < 12 && eyeRatio > 0.88) return "Photo is fully frontal — use the front scanner instead."
  if (rollDeg > 40) return "Extreme head tilt — profile contour not reliably measurable."
  return null
}

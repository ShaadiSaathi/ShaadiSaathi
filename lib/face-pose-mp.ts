// lib/face-pose-mp.ts
// Frontal pose validation — Ch.1 v1.1: accept imperfect photos; reject only extremes.

import type { Point } from "./face-analysis"
import { shouldRejectFrontPose } from "./anthropometry/image-quality"

export function estimateFrontYawDeg(lms: Point[]): number {
  const midX = (lms[234].x + lms[454].x) / 2
  const faceW = Math.abs(lms[454].x - lms[234].x) || 1
  const yawRatio = (lms[4].x - midX) / faceW
  return Math.atan(yawRatio * 2.2) * (180 / Math.PI)
}

export function validateFrontalUpload(
  lms: Point[]
): { ok: true } | { ok: false; message: string } {
  if (lms.length < 300) {
    return { ok: false, message: "Could not detect a complete face — try a clearer photo with the full face visible." }
  }

  const midX = (lms[234].x + lms[454].x) / 2
  const faceW = Math.abs(lms[454].x - lms[234].x) || 1
  if (faceW < 20) {
    return { ok: false, message: "Face too small or cropped — ensure the full face is in frame." }
  }

  const yawRatio = (lms[4].x - midX) / faceW
  if (Math.abs(yawRatio) > 0.52) {
    return { ok: false, message: "Face turned too far to the side for front analysis." }
  }

  const lp = lms[468] ?? lms[133]
  const rp = lms[473] ?? lms[362]
  const rollDeg = Math.atan2(rp.y - lp.y, rp.x - lp.x) * (180 / Math.PI)
  const noseLen = Math.hypot(lms[168].x - lms[2].x, lms[168].y - lms[2].y)
  const pitchDeg = ((noseLen / (faceW * 0.26)) - 1) * 25
  const yawDeg = estimateFrontYawDeg(lms)

  const reject = shouldRejectFrontPose(yawDeg, pitchDeg, rollDeg)
  if (reject) return { ok: false, message: reject }

  return { ok: true }
}

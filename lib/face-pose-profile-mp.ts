// lib/face-pose-profile-mp.ts
// Profile pose — Ch.1 v1.1: accept oblique profiles; reject only extremes.

import type { Point } from "./face-analysis"
import { profilePoseQualityFactor, shouldRejectProfilePose } from "./anthropometry/image-quality"

export type ProfileSide = "left" | "right"

export function detectProfileSide(lms: Point[]): ProfileSide {
  const midX = (lms[234].x + lms[454].x) / 2
  const faceW = Math.abs(lms[454].x - lms[234].x) || 1
  const yawRatio = (lms[4].x - midX) / faceW
  return yawRatio > 0 ? "left" : "right"
}

export function estimateProfileYawDeg(lms: Point[]): number {
  const midX = (lms[234].x + lms[454].x) / 2
  const faceW = Math.abs(lms[454].x - lms[234].x) || 1
  const yawRatio = (lms[4].x - midX) / faceW
  return Math.abs(Math.atan(yawRatio * 2.8) * (180 / Math.PI))
}

export function validateProfileUpload(
  lms: Point[]
): { ok: true; side: ProfileSide; yawDeg: number; poseFactor: number } | { ok: false; message: string } {
  if (lms.length < 300) {
    return { ok: false, message: "Could not detect a complete face — try a clearer photo." }
  }

  const faceW = Math.abs(lms[454].x - lms[234].x) || 1
  if (faceW < 20) {
    return { ok: false, message: "Face too small or cropped — include the full profile in frame." }
  }

  const yawDeg = estimateProfileYawDeg(lms)
  const leftEyeW = Math.abs(lms[33].x - lms[133].x)
  const rightEyeW = Math.abs(lms[263].x - lms[362].x)
  const eyeRatio = Math.min(leftEyeW, rightEyeW) / (Math.max(leftEyeW, rightEyeW) || 1)

  const lp = lms[468] ?? lms[133]
  const rp = lms[473] ?? lms[362]
  const rollDeg = Math.abs(Math.atan2(rp.y - lp.y, rp.x - lp.x) * (180 / Math.PI))

  const reject = shouldRejectProfilePose(yawDeg, rollDeg, eyeRatio)
  if (reject) return { ok: false, message: reject }

  return {
    ok: true,
    side: detectProfileSide(lms),
    yawDeg,
    poseFactor: profilePoseQualityFactor(yawDeg, rollDeg),
  }
}

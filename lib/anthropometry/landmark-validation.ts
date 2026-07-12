// lib/anthropometry/landmark-validation.ts
// Anatomical relationship checks — lenient tolerances; reject only extreme outliers.

import type { AnnotatedProfileLandmarks } from "./landmark-registry"
import type { ProfileSide } from "../face-pose-profile-mp"
import type { ValidationResult } from "./types"

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export function validateProfileLandmarks(
  lm: AnnotatedProfileLandmarks,
  _side: ProfileSide
): ValidationResult {
  const faceH = dist(lm.nasion, lm.menton) || 1
  const tol = faceH * 0.12

  if (faceH < 15) {
    return { ok: false, message: "Face not visible in image — ensure profile is not heavily cropped." }
  }

  // Soft checks with tolerance — MediaPipe estimates can be noisy on casual photos
  if (lm.subnasale.y < lm.pronasale.y - tol) {
    return { ok: false, message: "Could not reliably locate nose base — try a clearer side photo." }
  }
  if (lm.menton.y < lm.pogonion.y - tol) {
    return { ok: false, message: "Could not reliably locate chin — try a clearer side photo." }
  }

  return { ok: true }
}

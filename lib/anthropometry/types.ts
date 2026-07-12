// lib/anthropometry/types.ts
// Facial Anthropometry Manual — Ch.1 core types.

export type LandmarkType = "A" | "B" | "C" | "D" | "E"

/** Sub-pixel landmark in image space; raw coords are never overwritten. */
export type LandmarkPoint = {
  x: number
  y: number
  z?: number
  confidence: number
  type: LandmarkType
  /** Stable identifier, e.g. "pronasale" */
  id: string
}

export type PipelineStage =
  | "quality"
  | "face_detection"
  | "orientation"
  | "pose"
  | "rotation_correction"
  | "landmark_prediction"
  | "landmark_refinement"
  | "confidence_assessment"
  | "landmark_validation"
  | "measurement"

export type ImageQualityInput = {
  width: number
  height: number
  faceBBoxHeight: number
}

export type PoseEstimate = {
  yawDeg: number
  pitchDeg: number
  rollDeg: number
}

export type QualityResult =
  | { ok: true }
  | { ok: false; message: string; stage: PipelineStage }

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; landmarkId?: string }

/** Measurement confidence cannot exceed min(required landmark confidences). */
export function propagateConfidence(
  landmarkConfidences: number[],
  measurementFactor = 1.0
): number {
  if (landmarkConfidences.length === 0) return 0
  const minLm = Math.min(...landmarkConfidences)
  return Math.min(1, minLm * measurementFactor)
}

// lib/anthropometry/confidence-model.ts
// Manual Ch.2 §2.1.15 — weighted landmark confidence.

export type ConfidenceInputs = {
  imageQuality: number    // 30%
  visibility: number      // 25%
  anatomicalAgreement: number // 20%
  contourStrength: number   // 15%
  textureConfidence: number   // 10%
}

const WEIGHTS = {
  imageQuality: 0.30,
  visibility: 0.25,
  anatomicalAgreement: 0.20,
  contourStrength: 0.15,
  textureConfidence: 0.10,
} as const

export function computeLandmarkConfidence(inputs: ConfidenceInputs): number {
  const score =
    inputs.imageQuality * WEIGHTS.imageQuality +
    inputs.visibility * WEIGHTS.visibility +
    inputs.anatomicalAgreement * WEIGHTS.anatomicalAgreement +
    inputs.contourStrength * WEIGHTS.contourStrength +
    inputs.textureConfidence * WEIGHTS.textureConfidence

  return Math.min(0.99, Math.max(0.1, score))
}

export function defaultConfidenceInputs(
  resolutionFactor: number,
  poseFactor: number,
  skeletalEstimate: boolean
): ConfidenceInputs {
  return {
    imageQuality: resolutionFactor,
    visibility: poseFactor,
    anatomicalAgreement: 0.95,
    contourStrength: skeletalEstimate ? 0.72 : 0.90,
    textureConfidence: skeletalEstimate ? 0.75 : 0.88,
  }
}

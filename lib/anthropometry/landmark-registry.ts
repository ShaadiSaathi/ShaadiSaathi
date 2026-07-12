// lib/anthropometry/landmark-registry.ts
// Manual Ch.1 §1.4 + Ch.2 §2.1 — classification, atlas entries, confidence model.

import type { LandmarkPoint, LandmarkType } from "./types"
import { PROFILE_ATLAS, type LandmarkCategory } from "./landmark-atlas"
import { computeLandmarkConfidence, defaultConfidenceInputs } from "./confidence-model"

type LandmarkSpec = {
  id: string
  type: LandmarkType
  category: LandmarkCategory
  skeletalEstimate: boolean
}

function spec(id: keyof typeof PROFILE_ATLAS): LandmarkSpec {
  const atlas = PROFILE_ATLAS[id]
  const typeMap: Record<LandmarkCategory, LandmarkType> = {
    max_projection: "A",
    min_projection: "B",
    boundary: "B",
    curvature_transition: "B",
    skeletal_estimate: "D",
  }
  return {
    id: atlas.id,
    type: typeMap[atlas.category],
    category: atlas.category,
    skeletalEstimate: atlas.category === "skeletal_estimate",
  }
}

export const PROFILE_LANDMARK_SPECS: Record<keyof typeof PROFILE_ATLAS, LandmarkSpec> = {
  glabella: spec("glabella"),
  nasion: spec("nasion"),
  pronasale: spec("pronasale"),
  columella: spec("columella"),
  subnasale: spec("subnasale"),
  upperLip: spec("upperLip"),
  lowerLip: spec("lowerLip"),
  pogonion: spec("pogonion"),
  menton: spec("menton"),
  cervical: spec("cervical"),
  gonion: spec("gonion"),
  orbitale: spec("orbitale"),
  porion: spec("porion"),
  condylion: spec("condylion"),
}

export function makeLandmark(
  id: keyof typeof PROFILE_LANDMARK_SPECS,
  x: number,
  y: number,
  modifiers: {
    poseFactor?: number
    resolutionFactor?: number
    expressionFactor?: number
    anatomicalAgreement?: number
  } = {}
): LandmarkPoint {
  const s = PROFILE_LANDMARK_SPECS[id]
  const inputs = defaultConfidenceInputs(
    modifiers.resolutionFactor ?? 0.9,
    modifiers.poseFactor ?? 1,
    s.skeletalEstimate
  )
  if (modifiers.anatomicalAgreement != null) {
    inputs.anatomicalAgreement = modifiers.anatomicalAgreement
  }
  if (modifiers.expressionFactor != null) {
    inputs.visibility *= modifiers.expressionFactor
  }

  return {
    id: s.id,
    x,
    y,
    confidence: computeLandmarkConfidence(inputs),
    type: s.type,
  }
}

export type AnnotatedProfileLandmarks = Record<keyof typeof PROFILE_LANDMARK_SPECS, LandmarkPoint>

export function landmarksToPoints(lm: AnnotatedProfileLandmarks): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {}
  for (const [, v] of Object.entries(lm)) {
    out[v.id] = { x: v.x, y: v.y }
  }
  return out
}

// lib/anthropometry/pipeline.ts
// Manual §1.12 — staged processing pipeline (profile view).

import type { Point } from "../face-analysis"
import type { ProfileSide } from "../face-pose-profile-mp"
import { validateProfileUpload } from "../face-pose-profile-mp"
import {
  estimateFaceBBoxHeight,
  resolutionConfidenceFactor,
  validateImageQuality,
} from "./image-quality"
import { validateProfileLandmarks } from "./landmark-validation"
import type { PipelineStage, PoseEstimate, QualityResult } from "./types"

export type PipelineContext = {
  stage: PipelineStage
  imageWidth: number
  imageHeight: number
  rawLandmarks: Point[]
  side?: ProfileSide
  yawDeg?: number
  pose?: PoseEstimate
  resolutionFactor: number
}

export function runQualityStage(
  width: number,
  height: number,
  pixelLandmarks: Point[]
): QualityResult {
  const faceH = estimateFaceBBoxHeight(pixelLandmarks)
  return validateImageQuality({ width, height, faceBBoxHeight: faceH })
}

export function runOrientationStage(
  pixelLandmarks: Point[]
): { ok: true; side: ProfileSide; yawDeg: number } | { ok: false; message: string } {
  return validateProfileUpload(pixelLandmarks)
}

export function estimatePoseFromLandmarks(lms: Point[]): PoseEstimate {
  const lp = lms[468] ?? lms[133]
  const rp = lms[473] ?? lms[362]
  const rollDeg = Math.atan2(rp.y - lp.y, rp.x - lp.x) * (180 / Math.PI)
  const midX = (lms[234].x + lms[454].x) / 2
  const faceW = Math.abs(lms[454].x - lms[234].x) || 1
  const yawRatio = (lms[4].x - midX) / faceW
  const yawDeg = Math.atan(yawRatio * 2.8) * (180 / Math.PI)
  const noseLen = Math.hypot(lms[168].x - lms[2].x, lms[168].y - lms[2].y)
  const pitchDeg = ((noseLen / (faceW * 0.26)) - 1) * 25
  return { yawDeg, pitchDeg, rollDeg }
}

export function poseConfidenceFactor(pose: PoseEstimate, profile = true): number {
  if (profile) {
    const yawDev = Math.abs(Math.abs(pose.yawDeg) - 82)
    return Math.max(0.5, 1 - yawDev / 45)
  }
  return Math.max(0.5, 1 - Math.abs(pose.yawDeg) / 15)
}

export function createPipelineContext(
  width: number,
  height: number,
  rawLandmarks: Point[]
): PipelineContext {
  return {
    stage: "face_detection",
    imageWidth: width,
    imageHeight: height,
    rawLandmarks,
    resolutionFactor: resolutionConfidenceFactor(Math.max(width, height)),
  }
}

export { validateProfileLandmarks }

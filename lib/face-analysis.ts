// lib/face-analysis.ts
// Base types shared across the scanner pipeline.

export type Point = { x: number; y: number }

export type BreakdownItem = {
  label: string
  score: number
  measured: string
  ideal: string
  tip: string
  confidence: number
  unreliable?: boolean
  reason?: string
}

export type FaceResults = {
  overall: number
  breakdown: BreakdownItem[]
  chatSeed: string
  gender: "male" | "female"
}

// Entry point used by the scanner UI. Delegates to the front-face scorer.
import { scoreFrontFace } from "./front-face-scoring"

export function calculateScores(
  positions: Point[],
  gender: "male" | "female"
): FaceResults {
  return scoreFrontFace(positions, gender)
}

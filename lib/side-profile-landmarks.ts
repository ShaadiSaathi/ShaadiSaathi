/**
 * Side-profile landmark extraction for MediaPipe 478-point Face Mesh.
 *
 * KEY INSIGHT: In a side-profile photo, MediaPipe still detects all 478
 * landmarks, but the occluded-side landmarks collapse toward the visible
 * edge. We CANNOT use the same index assumptions as front view.
 *
 * Instead, we identify profile landmarks by their GEOMETRIC POSITION
 * in the image — the highest nose point, the most forward chin point,
 * etc. — rather than relying on fixed indices that assume front view.
 *
 * For angles that require points along the profile silhouette, we trace
 * the outermost contour of the face from forehead to chin to throat.
 */

import type { Point } from "./face-analysis"

export type SideProfileLandmarks = {
  trichion:     Point
  glabella:     Point
  nasion:       Point
  dorsumMid:    Point
  pronasale:    Point
  columella:    Point
  subnasale:    Point
  labraleSup:   Point
  stomion:      Point
  labraleInf:   Point
  mentolabial:  Point
  pogonion:     Point
  menton:       Point
  gonion:       Point
  cervicalPt:   Point
  visibleSide:  "left" | "right"
}

export function detectVisibleSide(p: Point[]): "left" | "right" {
  const midX = (p[234].x + p[454].x) / 2
  return p[4].x < midX ? "left" : "right"
}

function mostForward(p: Point[], indices: number[], side: "left" | "right"): Point {
  let best = p[indices[0]]
  for (const i of indices) {
    if (!p[i]) continue
    if (side === "left" && p[i].x < best.x) best = p[i]
    if (side === "right" && p[i].x > best.x) best = p[i]
  }
  return { ...best }
}

function deepest(p: Point[], indices: number[], side: "left" | "right"): Point {
  let best = p[indices[0]]
  for (const i of indices) {
    if (!p[i]) continue
    if (side === "left" && p[i].x > best.x) best = p[i]
    if (side === "right" && p[i].x < best.x) best = p[i]
  }
  return { ...best }
}

export function extractSideProfileLandmarks(p: Point[]): SideProfileLandmarks {
  const side = detectVisibleSide(p)

  const glabella = mostForward(p, [9, 10, 151, 107, 336, 66, 296, 69, 299], side)

  const nasion = deepest(p, [168, 6, 197, 195, 5, 4], side)

  const dorsumMid = {
    x: (p[6].x + p[195].x) / 2,
    y: (p[6].y + p[195].y) / 2,
  }

  const pronasale = mostForward(p, [4, 1, 5, 195, 197], side)

  const columella = p[2] ?? p[4]

  const sn164 = p[164] ?? p[2]
  const alarL = p[129] ?? p[2]
  const alarR = p[358] ?? p[2]
  const subnasale: Point = {
    x: sn164.x * 0.5 + (alarL.x + alarR.x) / 2 * 0.25 + p[2].x * 0.25,
    y: sn164.y * 0.5 + (alarL.y + alarR.y) / 2 * 0.25 + p[2].y * 0.25,
  }

  const labraleSup = mostForward(p, [0, 13, 267, 37, 11, 302, 72], side)

  const stomion: Point = {
    x: (p[13].x + p[14].x) / 2,
    y: (p[13].y + p[14].y) / 2,
  }

  const labraleInf = mostForward(p, [17, 14, 402, 317, 15, 16, 86], side)

  const mentolabial = deepest(p, [18, 83, 313, 406, 182, 175], side)

  const pogonion = mostForward(p, [152, 199, 175, 396, 400, 148, 176], side)

  let menton = p[152]
  for (const i of [152, 199, 175, 396, 377, 148]) {
    if (p[i] && p[i].y > menton.y) menton = p[i]
  }
  menton = { ...menton }

  const gonion = side === "left"
    ? { ...p[172] }
    : { ...p[397] }

  const faceH = Math.abs(menton.y - nasion.y)
  const trichion: Point = {
    x: glabella.x,
    y: glabella.y - faceH * 0.65,
  }

  const cervicalPt: Point = {
    x: side === "left"
      ? gonion.x + Math.abs(gonion.x - menton.x) * 0.3
      : gonion.x - Math.abs(gonion.x - menton.x) * 0.3,
    y: menton.y + faceH * 0.25,
  }

  return {
    trichion, glabella, nasion, dorsumMid, pronasale, columella,
    subnasale, labraleSup, stomion, labraleInf, mentolabial,
    pogonion, menton, gonion, cervicalPt, visibleSide: side,
  }
}

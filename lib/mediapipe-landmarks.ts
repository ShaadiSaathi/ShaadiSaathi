// lib/mediapipe-landmarks.ts
// MediaPipe 478-point landmark index constants and anatomical extractor.

import type { Point } from "./face-analysis"

export const MP = {
  jawLeft: 234,
  jawRight: 454,
  menton: 152,
  zygionLeft: 234,
  zygionRight: 454,
  gonionLeft: 172,
  gonionRight: 397,
  nasion: 168,
  noseTip: 4,
  subnasale: 164,
  alarLeft: 129,
  alarRight: 358,
  leftOuterCanthus: 33,
  leftInnerCanthus: 133,
  rightInnerCanthus: 362,
  rightOuterCanthus: 263,
  leftIris: 468,
  rightIris: 473,
  leftUpperLid: 159,
  leftLowerLid: 145,
  rightUpperLid: 386,
  rightLowerLid: 374,
  leftBrowInner: 70,
  leftBrowPeak: 105,
  leftBrowOuter: 46,
  rightBrowInner: 300,
  rightBrowPeak: 334,
  rightBrowOuter: 276,
  glabella: 9,
  foreheadTop: 10,
  upperLipTop: 13,
  upperLipBottom: 14,
  lowerLipTop: 17,
  lowerLipBottom: 18,
  leftChelion: 61,
  rightChelion: 291,
} as const

export type MPLandmarks = {
  leftPupil: Point
  rightPupil: Point
  leftInnerCanthus: Point
  rightInnerCanthus: Point
  leftOuterCanthus: Point
  rightOuterCanthus: Point
  nasion: Point
  subnasale: Point
  glabella: Point
  stomion: Point
  upperLipTop: Point
  lowerLipBottom: Point
  leftChelion: Point
  rightChelion: Point
  leftZygion: Point
  rightZygion: Point
  leftGonion: Point
  rightGonion: Point
  menton: Point
  trichion: Point
  alarLeft: Point
  alarRight: Point
  leftBrowInner: Point
  rightBrowInner: Point
  leftUpperLid: Point
  leftLowerLid: Point
  rightUpperLid: Point
  rightLowerLid: Point
}

export function extractMPLandmarks(p: Point[]): MPLandmarks {
  const get = (i: number): Point => p[i] ?? { x: 0, y: 0 }
  const hasIris = p.length >= 478

  const leftPupil = hasIris ? get(MP.leftIris) : avg([get(33), get(133), get(159), get(145)])
  const rightPupil = hasIris ? get(MP.rightIris) : avg([get(263), get(362), get(386), get(374)])

  return {
    leftPupil,
    rightPupil,
    leftInnerCanthus: get(MP.leftInnerCanthus),
    rightInnerCanthus: get(MP.rightInnerCanthus),
    leftOuterCanthus: get(MP.leftOuterCanthus),
    rightOuterCanthus: get(MP.rightOuterCanthus),
    nasion: get(MP.nasion),
    subnasale: estimateSubnasale(p),
    glabella: get(MP.glabella),
    stomion: {
      x: (get(MP.upperLipTop).x + get(MP.upperLipBottom).x) / 2,
      y: (get(MP.upperLipTop).y + get(MP.upperLipBottom).y) / 2,
    },
    upperLipTop: get(MP.upperLipTop),
    lowerLipBottom: get(MP.lowerLipBottom),
    leftChelion: get(MP.leftChelion),
    rightChelion: get(MP.rightChelion),
    leftZygion: get(MP.zygionLeft),
    rightZygion: get(MP.zygionRight),
    leftGonion: get(MP.gonionLeft),
    rightGonion: get(MP.gonionRight),
    menton: get(MP.menton),
    trichion: estimateTrichion(p),
    alarLeft: get(MP.alarLeft),
    alarRight: get(MP.alarRight),
    leftBrowInner: get(MP.leftBrowInner),
    rightBrowInner: get(MP.rightBrowInner),
    leftUpperLid: get(MP.leftUpperLid),
    leftLowerLid: get(MP.leftLowerLid),
    rightUpperLid: get(MP.rightUpperLid),
    rightLowerLid: get(MP.rightLowerLid),
  }
}

function avg(pts: Point[]): Point {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
}

function estimateTrichion(p: Point[]): Point {
  // MediaPipe index 10 is mid-forehead, not the hairline.
  // Project above glabella using 85% of nasion-to-menton distance.
  const glabella = p[9] ?? { x: 0, y: 0 }
  const nasion = p[168] ?? { x: 0, y: 0 }
  const menton = p[152] ?? { x: 0, y: 0 }
  const faceH = Math.abs(menton.y - nasion.y)
  return {
    x: glabella.x,
    y: glabella.y - faceH * 0.85,
  }
}

function estimateSubnasale(p: Point[]): Point {
  // Index 2 is nose tip (pronasale), NOT subnasale.
  // Blend nose tip, columella base (164), and alar midpoint so subnasale
  // sits correctly between the nose base and the upper lip.
  const noseTip = p[2] ?? { x: 0, y: 0 }
  const col = p[164] ?? { x: 0, y: 0 }
  const alarL = p[129] ?? { x: 0, y: 0 }
  const alarR = p[358] ?? { x: 0, y: 0 }
  return {
    x: noseTip.x * 0.5 + col.x * 0.3 + (alarL.x + alarR.x) / 2 * 0.2,
    y: noseTip.y * 0.5 + col.y * 0.3 + (alarL.y + alarR.y) / 2 * 0.2,
  }
}

// lib/mediapipe-detector.ts
// MediaPipe Face Landmarker detector. 478 landmarks + iris centres + 3D depth.

import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision"

export type Point = { x: number; y: number }
export type Point3D = { x: number; y: number; z: number }

export type MediaPipeResult = {
  pixelLandmarks: Point[]
  landmarks3D: Point3D[]
}

let _detector: FaceLandmarker | null = null
let _loading: Promise<FaceLandmarker> | null = null

export async function getMediaPipeDetector() {
  if (_detector) return _detector
  if (_loading) return _loading

  _loading = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    )

    const options = {
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
      runningMode: "IMAGE" as const,
      numFaces: 1,
    }

    try {
      _detector = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/mediapipe/face_landmarker.task",
          delegate: "GPU",
        },
        ...options,
      })
    } catch {
      _detector = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/mediapipe/face_landmarker.task",
          delegate: "CPU",
        },
        ...options,
      })
    }

    return _detector
  })()

  return _loading
}

export async function detectFaceLandmarks(
  img: HTMLImageElement,
  passes = 3
): Promise<MediaPipeResult | null> {
  const detector = await getMediaPipeDetector()

  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height

  const allLandmarks: Point[][] = []

  for (let pass = 0; pass < passes; pass++) {
    let source: HTMLImageElement | HTMLCanvasElement = img

    if (pass > 0 && allLandmarks.length > 0) {
      source = cropToFace(img, allLandmarks[0], w, h) ?? img
    }

    const result = detector.detect(source)
    if (!result.faceLandmarks?.length) continue

    const raw = result.faceLandmarks[0]
    const sw = source instanceof HTMLCanvasElement ? source.width : w
    const sh = source instanceof HTMLCanvasElement ? source.height : h

    if (pass > 0 && source instanceof HTMLCanvasElement) {
      const bounds = getFaceBounds(allLandmarks[0], w, h)
      allLandmarks.push(raw.map((lm: NormalizedLandmark) => ({
        x: (lm.x * sw + bounds.x0) / w,
        y: (lm.y * sh + bounds.y0) / h,
      })))
    } else {
      allLandmarks.push(raw.map((lm: NormalizedLandmark) => ({ x: lm.x, y: lm.y })))
    }
  }

  if (allLandmarks.length === 0) return null

  const numPts = allLandmarks[0].length
  const averaged: Point[] = Array.from({ length: numPts }, (_, i) => ({
    x: allLandmarks.reduce((s, p) => s + p[i].x, 0) / allLandmarks.length * w,
    y: allLandmarks.reduce((s, p) => s + p[i].y, 0) / allLandmarks.length * h,
  }))

  const final3D = detector.detect(img)
  const raw3D = final3D.faceLandmarks?.[0] ?? []

  return {
    pixelLandmarks: averaged,
    landmarks3D: raw3D.map((lm: NormalizedLandmark) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })),
  }
}

function getFaceBounds(lms: Point[], imgW: number, imgH: number) {
  const xs = lms.map(l => l.x * imgW)
  const ys = lms.map(l => l.y * imgH)
  const pad = (Math.max(...xs) - Math.min(...xs)) * 0.12
  return {
    x0: Math.max(0, Math.min(...xs) - pad),
    y0: Math.max(0, Math.min(...ys) - pad),
    x1: Math.min(imgW, Math.max(...xs) + pad),
    y1: Math.min(imgH, Math.max(...ys) + pad),
  }
}

function cropToFace(
  img: HTMLImageElement,
  lms: Point[],
  imgW: number,
  imgH: number
): HTMLCanvasElement | null {
  const b = getFaceBounds(lms, imgW, imgH)
  const cw = b.x1 - b.x0
  const ch = b.y1 - b.y0
  if (cw < 10 || ch < 10) return null
  const canvas = document.createElement("canvas")
  canvas.width = cw
  canvas.height = ch
  canvas.getContext("2d")!.drawImage(img, b.x0, b.y0, cw, ch, 0, 0, cw, ch)
  return canvas
}

// lib/facial-ideals.ts
// Looksmax-community ideal ranges, calibrated for MediaPipe 478-point landmarks.
// Not medical standards.

export type IdealRange = { lo: number; hi: number; mid: number; label: string }

function range(lo: number, hi: number, label: string): IdealRange {
  return { lo, hi, mid: (lo + hi) / 2, label }
}

export const FRONT_IDEALS = {
  male: {
    canthalTilt:      range(2,    12,   "+2° to +12°"),
    fwhr:             range(1.5,  2.0,  "1.5–2.0"),
    bzygBigonial:     range(1.2,  1.4,  "1.20–1.40"),
    eyeSpacing:       range(1.0,  1.5,  "1.0–1.5× eye width"),
    faceLengthWidth:  range(1.3,  1.65, "1.30–1.65"),
    midfaceRatio:     range(0.42, 0.52, "0.42–0.52"),
    lowerFaceRatio:   range(0.26, 0.40, "0.26–0.40"),
    chinPhiltrum:     range(1.6,  2.4,  "1.6–2.4"),
    mouthNose:        range(1.0,  1.6,  "1.00–1.60"),
    lipRatio:         range(0.9,  1.8,  "0.90–1.80"),
    palpebralFissure: range(2.7,  3.2,  "2.7–3.2"),
    gonialAngle:      range(120,  128,  "120–128°"),
    facialThirds:     range(1.0,  1.0,  "1:1:1"),
    mentocervical:    range(80,   95,   "80–95°"),
  },
  female: {
    canthalTilt:      range(4,    14,   "+4° to +14°"),
    fwhr:             range(1.5,  1.85, "1.50–1.85"),
    bzygBigonial:     range(1.2,  1.45, "1.20–1.45"),
    eyeSpacing:       range(1.0,  1.5,  "1.0–1.5× eye width"),
    faceLengthWidth:  range(1.3,  1.65, "1.30–1.65"),
    midfaceRatio:     range(0.42, 0.52, "0.42–0.52"),
    lowerFaceRatio:   range(0.26, 0.40, "0.26–0.40"),
    chinPhiltrum:     range(1.6,  2.4,  "1.6–2.4"),
    mouthNose:        range(1.0,  1.6,  "1.00–1.60"),
    lipRatio:         range(0.9,  1.8,  "0.90–1.80"),
    palpebralFissure: range(2.6,  3.1,  "2.6–3.1"),
    gonialAngle:      range(125,  135,  "125–135°"),
    facialThirds:     range(1.0,  1.0,  "1:1:1"),
    mentocervical:    range(85,   100,  "85–100°"),
  },
} as const

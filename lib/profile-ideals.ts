// lib/profile-ideals.ts
// Side-profile cephalometric ideals (soft-tissue / ratio-based).
// Millimeter ranges are scaled from clinical norms; absolute mm requires calibration.

import type { IdealRange } from "./facial-ideals"

function range(lo: number, hi: number, label: string): IdealRange {
  return { lo, hi, mid: (lo + hi) / 2, label }
}

export const PROFILE_IDEALS = {
  male: {
    nasolabial:        range(90,  95,  "90°–95°"),
    nasofrontal:       range(115, 130, "115°–130°"),
    gonial:            range(115, 125, "115°–125°"),
    mandibularPlane:   range(22,  26,  "22°–26°"),
    mentocervical:     range(80,  90,  "80°–90°"),
    facialConvexity:   range(165, 175, "165°–175°"),
    chinProjection:    range(0,   2,   "0 to +2mm past nasion vertical"),
    eLineUpper:        range(2,   4,   "2–4mm behind E-line"),
    eLineLower:        range(2,   4,   "2–4mm behind E-line"),
    lowerFaceThirds:   range(0.45, 0.55, "1:2 upper:lower segment ratio"),
    nasalProjection:   range(0.55, 0.60, "0.55–0.60 Baum ratio"),
    mandibularBody:    range(0.38, 0.48, "Gonion→menton / face height"),
    ramusHeight:       range(0.22, 0.32, "Condylion→gonion / face height"),
    upperLipThickness: range(0.06, 0.09, "7–9mm equiv. / face height"),
    lowerLipThickness: range(0.08, 0.11, "9–11mm equiv. / face height"),
  },
  female: {
    nasolabial:        range(95,  105, "95°–105°"),
    nasofrontal:       range(120, 130, "120°–130°"),
    gonial:            range(120, 130, "120°–130°"),
    mandibularPlane:   range(24,  28,  "24°–28°"),
    mentocervical:     range(80,  95,  "80°–95°"),
    facialConvexity:   range(165, 170, "165°–170°"),
    chinProjection:    range(-2,  0,   "0 to −2mm behind nasion vertical"),
    eLineUpper:        range(1,   2,   "1–2mm behind E-line"),
    eLineLower:        range(1,   2,   "1–2mm behind E-line"),
    lowerFaceThirds:   range(0.45, 0.55, "1:2 upper:lower segment ratio"),
    nasalProjection:   range(0.55, 0.60, "0.55–0.60 Baum ratio"),
    mandibularBody:    range(0.34, 0.44, "Gonion→menton / face height"),
    ramusHeight:       range(0.18, 0.28, "Condylion→gonion / face height"),
    upperLipThickness: range(0.07, 0.10, "8–10mm equiv. / face height"),
    lowerLipThickness: range(0.09, 0.12, "10–12mm equiv. / face height"),
  },
} as const

export type ProfileIdealKey = keyof typeof PROFILE_IDEALS.male

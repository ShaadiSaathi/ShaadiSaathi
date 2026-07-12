export type IdealRange = { lo: number; hi: number; mid: number; label: string }

function range(lo: number, hi: number, label: string): IdealRange {
  return { lo, hi, mid: (lo + hi) / 2, label }
}

export const SIDE_IDEALS = {
  male: {
    nasofrontal:          range(115, 135, "115–135°"),
    nasolabial:           range(85,  105, "85–105°"),
    mentolabial:          range(100, 130, "100–130°"),
    gonialAngle:          range(110, 130, "110–130°"),
    cervicomental:        range(75,  100, "75–100°"),
    facialConvexity:      range(160, 178, "160–178°"),
    totalFacialConvexity: range(130, 148, "130–148°"),
    nasomental:           range(115, 135, "115–135°"),
    nasofacial:           range(25,  42,  "25–42°"),
    nasalTipAngle:        range(95,  120, "95–120°"),
    nasalProjection:      range(0.45, 0.65, "0.45–0.65"),
    mandibularPlane:      range(18,  35,  "18–35°"),
    eLineUpper:           range(-6,  1,   "-6 to +1 mm"),
    eLineLower:           range(-4,  2,   "-4 to +2 mm"),
    foreheadInclination:  range(5,   20,  "5–20°"),
  },
  female: {
    nasofrontal:          range(120, 140, "120–140°"),
    nasolabial:           range(90,  115, "90–115°"),
    mentolabial:          range(105, 135, "105–135°"),
    gonialAngle:          range(115, 135, "115–135°"),
    cervicomental:        range(80,  105, "80–105°"),
    facialConvexity:      range(163, 180, "163–180°"),
    totalFacialConvexity: range(135, 152, "135–152°"),
    nasomental:           range(115, 135, "115–135°"),
    nasofacial:           range(25,  42,  "25–42°"),
    nasalTipAngle:        range(100, 125, "100–125°"),
    nasalProjection:      range(0.45, 0.65, "0.45–0.65"),
    mandibularPlane:      range(20,  37,  "20–37°"),
    eLineUpper:           range(-5,  1,   "-5 to +1 mm"),
    eLineLower:           range(-3,  3,   "-3 to +3 mm"),
    foreheadInclination:  range(3,   18,  "3–18°"),
  },
} as const

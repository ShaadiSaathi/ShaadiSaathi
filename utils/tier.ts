export type Tier =
  | "Sub5"
  | "LTN"
  | "MTN"
  | "HTN"
  | "HTN+"
  | "Chadlite"
  | "Chad"

export function getTier(score: number): Tier {
  if (score <= 20) return "Sub5"
  if (score <= 49) return "LTN"
  if (score <= 60) return "MTN"
  if (score <= 70) return "HTN"
  if (score <= 79) return "HTN+"
  if (score <= 84) return "Chadlite"
  return "Chad"
}

export function getTierColor(tier: Tier): string {
  switch (tier) {
    case "Sub5":
      return "#E74C3C"
    case "LTN":
      return "#E94560"
    case "MTN":
      return "#F39C12"
    case "HTN":
      return "#F5A623"
    case "HTN+":
      return "#6C5CE7"
    case "Chadlite":
      return "#2ECC71"
    case "Chad":
      return "#00D2A0"
  }
}

export function getScoreColor(score: number): string {
  if (score >= 78) return "#2ECC71"
  if (score >= 52) return "#F5A623"
  return "#E74C3C"
}

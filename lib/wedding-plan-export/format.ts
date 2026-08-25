/** Pure formatting helpers for wedding-plan PDF export (safe for client + PDF). */

import { formatFullDate } from "@/lib/mockData"
import type { WeddingPlanExportSnapshot } from "@/lib/wedding-plan-export/types"

export function formatExportFilename(snapshot: WeddingPlanExportSnapshot): string {
  const slug = snapshot.couple
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  const day = snapshot.exportedAtIso.slice(0, 10)
  return `shaadi-saathi-${slug || "wedding"}-plan-${day}.pdf`
}

export function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`
}

export function formatExportDate(isoDate: string): string {
  if (!isoDate) return "—"
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return formatFullDate(isoDate)
    }
    return new Date(isoDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return isoDate
  }
}

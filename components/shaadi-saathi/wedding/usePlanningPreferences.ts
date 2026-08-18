"use client"

import { useMemo } from "react"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { normalizeWeddingPlanningPreferences } from "@/lib/wedding-preferences"
import type { WeddingPlanningPreferences } from "@/lib/wedding-preferences"

export function usePlanningPreferences(): WeddingPlanningPreferences | null {
  const { wedding } = useWedding()
  return useMemo(
    () => normalizeWeddingPlanningPreferences(wedding?.planningPreferences),
    [wedding?.planningPreferences]
  )
}

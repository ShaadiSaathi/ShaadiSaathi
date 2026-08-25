"use client"

/**
 * Bootstraps Firebase App Check as early as possible in the client tree,
 * before Auth / Firestore listeners do meaningful work.
 */

import { useEffect } from "react"
import { ensureAppCheck } from "@/lib/firebase/app-check"

export function AppCheckBootstrap() {
  useEffect(() => {
    ensureAppCheck()
  }, [])
  return null
}

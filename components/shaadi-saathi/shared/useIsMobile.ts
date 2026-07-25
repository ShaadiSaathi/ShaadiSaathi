"use client"

import { useEffect, useState } from "react"

/** Matches Tailwind `md` (768px): below this = mobile experience. */
export const MOBILE_MEDIA_QUERY = "(max-width: 767.98px)"

/**
 * Viewport-based mobile detection (not user-agent).
 * Returns `false` on the server and on first client paint so desktop never
 * flashes the mobile tree; updates after mount + on media changes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
    const apply = () => setIsMobile(mql.matches)
    apply()
    mql.addEventListener("change", apply)
    return () => mql.removeEventListener("change", apply)
  }, [])

  return isMobile
}

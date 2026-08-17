import type { Metadata } from "next"
import TestLandingV2Page from "@/components/test-redesign/TestLandingV2Page"

/**
 * Isolated palace parallax landing experiment — do not link from production surfaces.
 * Route: /test-landing-v2 — Lahore Fort cinematic scroll journey
 */

export const metadata: Metadata = {
  title: "Shaadi Saathi — Lahore Fort Landing (Test v2)",
  description:
    "Cinematic scroll journey through Lahore Fort. Isolated preview — not linked from the live site.",
  robots: { index: false, follow: false },
}

export default function TestLandingV2Route() {
  return <TestLandingV2Page />
}

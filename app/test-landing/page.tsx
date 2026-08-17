import type { Metadata } from "next"
import TestLandingPage from "@/components/test-redesign/TestLandingPage"

/**
 * Isolated layout experiment — do not link from production surfaces.
 * Route: /test-landing
 */

export const metadata: Metadata = {
  title: "Shaadi Saathi — Test Landing",
  description:
    "Isolated landing layout experiment for Shaadi Saathi. Not linked from the live site.",
  robots: { index: false, follow: false },
}

export default function TestLandingRoute() {
  return <TestLandingPage />
}

import type { Metadata } from "next"
import TestLandingV2Page from "@/components/test-redesign/TestLandingV2Page"

/**
 * Isolated palace parallax landing experiment — do not link from production surfaces.
 * Route: /test-landing-v2
 */

export const metadata: Metadata = {
  title: "Shaadi Saathi — Palace Landing (Test v2)",
  description:
    "Scroll-driven palace parallax landing experiment. Not linked from the live site.",
  robots: { index: false, follow: false },
}

export default function TestLandingV2Route() {
  return <TestLandingV2Page />
}

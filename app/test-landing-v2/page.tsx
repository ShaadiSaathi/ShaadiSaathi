/**
 * Legacy preview alias — canonical homepage is /
 */
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function TestLandingV2Redirect() {
  redirect("/")
}

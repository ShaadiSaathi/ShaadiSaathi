import type { Metadata } from "next"
import TestLandingV2Page from "@/components/test-redesign/TestLandingV2Page"

export const metadata: Metadata = {
  title: "Shaadi Saathi — Every Event. Every Guest. One Place.",
  description:
    "Plan your mehndi, baraat, and walima in one shared space. Guest lists, RSVPs, tasks, and schedules — without the WhatsApp chaos.",
}

export default function HomePage() {
  return <TestLandingV2Page />
}

"use client"

import { motion, useTransform, type MotionValue } from "framer-motion"
import Image from "next/image"

const APPROACH = "/test-landing-v2/fort-approach.webp"
const GATE = "/test-landing-v2/fort-gate.webp"
const SHEESH = "/test-landing-v2/fort-sheesh-mahal.webp"

/** Per-depth layer wrapper */
const DEPTH_LAYER = "absolute inset-0"

const IMAGE_GRADE =
  "object-cover object-center brightness-[0.93] contrast-[1.1] saturate-[1.08] sepia-[0.14]"

interface FortScrollBackgroundProps {
  progress: MotionValue<number>
}

export default function FortScrollBackground({ progress }: FortScrollBackgroundProps) {
  // Deliberate pacing — scale advances slowly early, gathers momentum mid-journey
  const scale = useTransform(progress, [0, 0.25, 0.55, 0.85, 1], [1, 1.18, 1.75, 2.35, 2.8])
  const y = useTransform(progress, [0, 1], ["0%", "-4%"])

  // Long crossfades — continuous forward motion, not hard cuts
  const approachOpacity = useTransform(progress, [0, 0.12, 0.28, 0.42], [1, 1, 0.55, 0])
  const gateOpacity = useTransform(progress, [0.26, 0.38, 0.52, 0.58, 0.72, 0.82], [0, 0.45, 1, 1, 0.5, 0])
  const sheeshOpacity = useTransform(progress, [0.68, 0.78, 0.92, 1], [0, 0.55, 1, 1])

  // Deeper inside → stronger legibility overlay
  const overlayOpacity = useTransform(progress, [0, 0.45, 0.72, 1], [0.38, 0.48, 0.68, 0.88])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a0808]">
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ scale, y, transformOrigin: "center center" }}
      >
        <motion.div className={DEPTH_LAYER} style={{ opacity: approachOpacity }}>
          <Image src={APPROACH} alt="" fill priority sizes="100vw" className={IMAGE_GRADE} />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(26,8,8,0.72)_100%)]"
            aria-hidden
          />
        </motion.div>

        <motion.div className={DEPTH_LAYER} style={{ opacity: gateOpacity }}>
          <Image src={GATE} alt="" fill sizes="100vw" className={IMAGE_GRADE} />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(26,8,8,0.78)_100%)]"
            aria-hidden
          />
        </motion.div>

        <motion.div className={DEPTH_LAYER} style={{ opacity: sheeshOpacity }}>
          <Image src={SHEESH} alt="" fill sizes="100vw" className={IMAGE_GRADE} />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(26,8,8,0.82)_100%)]"
            aria-hidden
          />
        </motion.div>

        {/* Unified dusk grade — warm highlights, maroon shadows */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-700/25 via-transparent to-maroon/40 mix-blend-multiply"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-maroon/50 via-transparent to-amber-200/10 mix-blend-soft-light"
          aria-hidden
        />
      </motion.div>

      {/* Text legibility — maroon-tinted, deepens through the journey */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-maroon/50 via-maroon/30 to-maroon/85"
        style={{ opacity: overlayOpacity }}
        aria-hidden
      />

      {/* Film grain — subtle texture across the whole frame */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
        aria-hidden
      />
    </div>
  )
}

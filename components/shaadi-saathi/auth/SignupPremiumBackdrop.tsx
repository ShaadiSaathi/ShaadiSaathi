"use client"

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import Image from "next/image"
import { useEffect, useState } from "react"
import {
  FORT_GRADE_OVERLAY,
  FORT_IMAGE_GRADE,
  FORT_SIGNUP_BACKDROP,
  FORT_SOFT_LIGHT,
  FORT_VIGNETTE,
} from "@/lib/design/fort-visual-tokens"

const PARALLAX_STRENGTH = 12

/**
 * Static on mobile; subtle mouse-follow parallax on desktop only.
 * Heavily blurred/darkened — atmosphere behind forms, never a focal point.
 */
export default function SignupPremiumBackdrop() {
  const reducedMotion = useReducedMotion()
  const [parallaxEnabled, setParallaxEnabled] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20, mass: 0.6 })

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)")
    const update = () => setParallaxEnabled(mq.matches && !reducedMotion)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [reducedMotion])

  useEffect(() => {
    if (!parallaxEnabled) return

    function onMove(e: MouseEvent) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      mouseX.set(nx * PARALLAX_STRENGTH)
      mouseY.set(ny * PARALLAX_STRENGTH)
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [parallaxEnabled, mouseX, mouseY])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#1a0808]"
      aria-hidden
    >
      <motion.div
        className="absolute inset-[-8%] will-change-transform"
        style={
          parallaxEnabled
            ? { x: springX, y: springY }
            : undefined
        }
      >
        <Image
          src={FORT_SIGNUP_BACKDROP}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`scale-110 object-cover object-center blur-[18px] sm:blur-[22px] lg:blur-[28px] ${FORT_IMAGE_GRADE}`}
        />
        <div className={`pointer-events-none absolute inset-0 ${FORT_VIGNETTE}`} />
        <div className={`pointer-events-none absolute inset-0 ${FORT_GRADE_OVERLAY}`} />
        <div className={`pointer-events-none absolute inset-0 ${FORT_SOFT_LIGHT}`} />
      </motion.div>

      {/* Legibility scrim — stronger on mobile (no parallax distraction) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0808]/75 via-[#1a0808]/82 to-[#1a0808]/92" />

      {/* Subtle film grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay lg:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  )
}

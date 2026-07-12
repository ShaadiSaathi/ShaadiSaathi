"use client"

import { motion, useReducedMotion } from "framer-motion"
import CTAButton from "./CTAButton"
import MehndiPattern from "./MehndiPattern"
import PhoneMockup from "./PhoneMockup"

export default function Hero() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <header className="relative overflow-hidden">
      <MehndiPattern opacity={0.05} />

      {/* Warm gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/8 via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16 lg:flex-row lg:items-center lg:gap-16 lg:pb-32 lg:pt-20">
        {/* Copy */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-maroon">
            Wedding planning, finally organized
          </p>

          <h1 className="font-display text-4xl font-bold leading-tight text-maroon-dark sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
            Every Event.
            <br />
            Every Guest.
            <br />
            <span className="text-gold-dark">One Place.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-maroon/75 lg:mx-0">
            Stop juggling WhatsApp groups and paper lists — plan your mehndi, baraat, and
            walima all in one beautiful shared space.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <CTAButton href="/dashboard">Start Planning Free</CTAButton>
            <a
              href="#how-it-works"
              className="text-sm font-semibold text-maroon underline-offset-4 transition-colors hover:text-gold-dark hover:underline"
            >
              See how it works →
            </a>
          </div>
        </motion.div>

        {/* Phone mockup */}
        <motion.div
          className="flex-1"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </header>
  )
}

"use client"

import { motion, useReducedMotion } from "framer-motion"
import CTAButton from "../CTAButton"
import MehndiPattern from "../MehndiPattern"
import PhoneMockup from "../PhoneMockup"
import RoleToggle, { type LandingRole } from "./RoleToggle"

interface LandingHeroProps {
  role: LandingRole
  onRoleChange: (role: LandingRole) => void
}

export default function LandingHero({ role, onRoleChange }: LandingHeroProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <header className="relative overflow-hidden">
      <MehndiPattern opacity={0.05} />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/8 via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-5 pb-20 pt-6 sm:px-8 sm:pb-28 sm:pt-10 lg:gap-12 lg:pb-32 lg:pt-12">
        <RoleToggle role={role} onRoleChange={onRoleChange} />

        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {role === "family" ? (
            <FamilyHeroCopy prefersReducedMotion={prefersReducedMotion} />
          ) : (
            <VendorHeroCopy prefersReducedMotion={prefersReducedMotion} />
          )}

          <motion.div
            className="flex-1 w-full max-w-[300px] lg:max-w-none"
            key={role}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {role === "family" ? <PhoneMockup /> : <VendorHeroVisual />}
          </motion.div>
        </div>
      </div>
    </header>
  )
}

function FamilyHeroCopy({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  return (
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
        Stop juggling WhatsApp groups and paper lists — plan your mehndi, baraat, and walima
        all in one beautiful shared space.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
        <CTAButton href="/signup">Start Planning Free</CTAButton>
        <a
          href="#how-it-works"
          className="text-sm font-semibold text-maroon underline-offset-4 hover:text-gold-dark hover:underline max-sm:inline-flex max-sm:min-h-[44px] max-sm:items-center max-sm:justify-center"
        >
          See how it works →
        </a>
      </div>
    </motion.div>
  )
}

function VendorHeroCopy({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  return (
    <motion.div
      className="flex-1 text-center lg:text-left"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-maroon">
        For caterers, decorators, photographers & more
      </p>
      <h1 className="font-display text-4xl font-bold leading-tight text-maroon-dark sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
        Get Booked.
        <br />
        Get Paid.
        <br />
        <span className="text-gold-dark">No Chasing.</span>
      </h1>
      <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-maroon/75 lg:mx-0">
        Join Shaadi Saathi to receive booking requests from families planning their wedding
        events, manage your schedule, and get paid reliably — deposit secured before you even
        show up.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
        <CTAButton href="/vendor/signup">List Your Business</CTAButton>
        <a
          href="#for-vendors"
          className="text-sm font-semibold text-maroon underline-offset-4 hover:text-gold-dark hover:underline max-sm:inline-flex max-sm:min-h-[44px] max-sm:items-center max-sm:justify-center"
        >
          Why vendors love us →
        </a>
      </div>
    </motion.div>
  )
}

/** PLACEHOLDER: replace with vendor dashboard mockup screenshot */
function VendorHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="absolute -inset-3 rounded-[2.5rem] border-2 border-gold/40" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[2rem] border-4 border-maroon/20 bg-white shadow-2xl shadow-maroon/15">
        <div className="bg-maroon px-4 py-2.5">
          <span className="font-display text-sm font-semibold text-ivory">Vendor Portal</span>
        </div>
        <div className="space-y-2 bg-ivory p-4">
          <p className="text-xs font-medium text-maroon/60">New requests</p>
          {["Ayesha & Bilal — Mehndi", "Fatima & Hassan — Walima"].map((item) => (
            <div key={item} className="rounded-xl border border-gold/20 bg-white p-3 text-sm">
              <p className="font-medium text-maroon-dark">{item}</p>
              <p className="text-xs text-gold-dark">Tap to accept →</p>
            </div>
          ))}
          <div className="rounded-xl bg-emerald-50 p-3 text-center text-xs font-medium text-emerald-800">
            Deposit held · Rs. 46,750
          </div>
        </div>
      </div>
    </div>
  )
}

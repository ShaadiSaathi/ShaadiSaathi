"use client"

import Link from "next/link"
import { useReducedMotion, useScroll } from "framer-motion"
import { useRef } from "react"
import {
  CatalogueTeaser,
  CheckIcon,
  heroPoints,
  offers,
  PalaceContentPanel,
  steps,
  TestLandingFooter,
  trustBadges,
  trustPoints,
} from "@/components/test-redesign/landing-content"
import PalaceScrollBackground from "@/components/test-redesign/PalaceScrollBackground"
import { Reveal, StaggerContainer, StaggerItem } from "@/components/test-redesign/scroll-motion"
import TestLandingPage from "@/components/test-redesign/TestLandingPage"
import TestLandingV2Nav from "@/components/test-redesign/TestLandingV2Nav"

export default function TestLandingV2Page() {
  const reducedMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  })

  if (reducedMotion) {
    return <TestLandingPage />
  }

  return (
    <div className="shaadi-saathi min-h-screen bg-maroon-dark text-ivory">
      <TestLandingV2Nav />

      <div ref={scrollRef} className="relative">
        <div className="sticky top-0 z-0 h-screen w-full" aria-hidden>
          <PalaceScrollBackground progress={scrollYProgress} />
        </div>

        <div className="relative z-10 -mt-[100vh]">
          {/* Layer 1 — approach (0–20%) */}
          <section
            id="hero"
            className="flex min-h-screen items-center px-4 pb-16 pt-24 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <PalaceContentPanel className="mx-auto max-w-3xl p-7 sm:p-10">
                <Reveal>
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-gold-dark">
                    South Asian wedding planning
                  </p>
                  <h1 className="mt-4 font-display text-4xl leading-[1.12] font-semibold tracking-tight text-maroon-dark sm:text-5xl lg:text-[3.25rem]">
                    Every ceremony. Every guest.{" "}
                    <span className="text-maroon underline decoration-gold/50 decoration-2 underline-offset-8">
                      One place.
                    </span>
                  </h1>
                  <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-maroon/70 sm:text-lg">
                    Replace scattered WhatsApp groups and paper lists with a shared space for
                    mehndi, baraat, and walima — guests, vendors, and timelines included.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      href="/signup"
                      className="inline-flex rounded-full bg-maroon px-6 py-3 font-sans text-sm font-medium text-ivory shadow-md shadow-maroon/20 transition hover:bg-maroon-dark"
                    >
                      Plan your wedding
                    </Link>
                    <Link
                      href="/vendor/signup"
                      className="inline-flex rounded-full border border-maroon/25 bg-white/50 px-6 py-3 font-sans text-sm font-medium text-maroon transition hover:border-maroon/40 hover:bg-white"
                    >
                      I&apos;m a vendor
                    </Link>
                  </div>
                </Reveal>

                <StaggerContainer as="ul" className="mt-8 max-w-lg space-y-2.5" stagger={0.06}>
                  {heroPoints.map((point) => (
                    <StaggerItem
                      key={point}
                      as="li"
                      className="flex gap-2.5 font-sans text-sm leading-snug text-maroon-dark/85"
                    >
                      <CheckIcon />
                      <span>{point}</span>
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                <StaggerContainer
                  className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-maroon/10 pt-6"
                  stagger={0.05}
                >
                  {trustBadges.map((badge) => (
                    <StaggerItem
                      key={badge.label}
                      className="flex items-center gap-2 font-sans text-xs text-maroon/55"
                    >
                      <span className="text-gold-dark">{badge.icon}</span>
                      {badge.label}
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </PalaceContentPanel>
            </div>
          </section>

          {/* Layer 2 — through the gates (20–40%) */}
          <section
            id="offers"
            className="flex min-h-screen items-center px-4 py-16 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <Reveal className="mb-6">
                <h2 className="font-display text-2xl font-semibold text-ivory sm:text-3xl">
                  Featured for your wedding week
                </h2>
                <p className="mt-2 font-sans text-sm text-ivory/70">
                  Swipe through what families use most during the week of events.
                </p>
              </Reveal>
              <StaggerContainer
                className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
                stagger={0.1}
              >
                {offers.map((offer) => (
                  <StaggerItem
                    key={offer.title}
                    as="article"
                    className="w-[min(85vw,20rem)] shrink-0 snap-start sm:w-[18.5rem]"
                  >
                    <PalaceContentPanel className="h-full p-5">
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
                        {offer.tag}
                      </p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-maroon-dark">
                        {offer.title}
                      </h3>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-maroon/65">
                        {offer.description}
                      </p>
                      <Link
                        href={offer.href}
                        className="mt-4 inline-flex font-sans text-sm font-medium text-maroon underline decoration-gold/40 underline-offset-4 transition hover:decoration-maroon"
                      >
                        {offer.linkLabel}
                      </Link>
                    </PalaceContentPanel>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </section>

          {/* Layer 3 — entrance (40–60%) */}
          <section
            id="paths"
            className="flex min-h-screen items-center px-4 py-16 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <Reveal className="mb-8">
                <h2 className="font-display text-3xl font-semibold tracking-tight text-ivory sm:text-4xl">
                  Choose the right starting point
                </h2>
                <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-ivory/75">
                  Whether you&apos;re coordinating a multi-event wedding or listing a service
                  families can book, Shaadi Saathi keeps both sides on the same page.
                </p>
              </Reveal>

              <StaggerContainer className="grid gap-5 md:grid-cols-2" stagger={0.12}>
                <StaggerItem as="article">
                  <article className="h-full rounded-3xl bg-gradient-to-br from-maroon to-maroon-dark p-7 text-ivory shadow-lg shadow-black/25 ring-1 ring-ivory/10 sm:p-8">
                    <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-gold/90">
                      For families
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold">Plan as a household</h3>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-ivory/80">
                      Shared guest lists, ceremony schedules, vendor bookings, and seating —
                      designed for South Asian weddings with more than one big day.
                    </p>
                    <Link
                      href="/signup"
                      className="mt-7 inline-flex rounded-full bg-ivory px-5 py-2.5 font-sans text-sm font-medium text-maroon transition hover:bg-white"
                    >
                      Create a wedding
                    </Link>
                  </article>
                </StaggerItem>

                <StaggerItem as="article">
                  <PalaceContentPanel className="h-full p-7 sm:p-8">
                    <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-gold-dark">
                      For vendors
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-maroon-dark">
                      Grow with real bookings
                    </h3>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-maroon/65">
                      Caterers, decorators, photographers, and entertainers receive requests
                      with event context — then manage jobs and messaging in one portal.
                    </p>
                    <Link
                      href="/vendor/signup"
                      className="mt-7 inline-flex rounded-full border border-maroon/25 px-5 py-2.5 font-sans text-sm font-medium text-maroon transition hover:border-maroon/45 hover:bg-maroon/5"
                    >
                      List your business
                    </Link>
                  </PalaceContentPanel>
                </StaggerItem>
              </StaggerContainer>

              <Reveal className="mt-10">
                <PalaceContentPanel className="p-6">
                  <CatalogueTeaser className="text-maroon/70" />
                </PalaceContentPanel>
              </Reveal>
            </div>
          </section>

          {/* Layer 4 — inside, trust (60–80%) */}
          <section
            id="trust"
            className="flex min-h-screen items-center px-4 py-16 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <PalaceContentPanel dark className="p-7 sm:p-10">
                <Reveal>
                  <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    Clear, calm, and credible
                  </h2>
                  <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-ivory/75">
                    We keep planning tools straightforward and payments transparent — so
                    families and vendors know where things stand without chasing updates.
                  </p>
                </Reveal>

                <StaggerContainer as="ul" className="mt-8 max-w-2xl space-y-3.5" stagger={0.07}>
                  {trustPoints.map((point) => (
                    <StaggerItem
                      key={point}
                      as="li"
                      className="flex gap-3 font-sans text-sm leading-relaxed text-ivory/90"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                          <path
                            d="M3.5 8.2l2.8 2.8 6.2-6.2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {point}
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                <Reveal delay={0.1}>
                  <Link
                    href="/upgrade"
                    className="mt-8 inline-flex font-sans text-sm font-medium text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-ivory"
                  >
                    See premium planning features →
                  </Link>
                </Reveal>
              </PalaceContentPanel>
            </div>
          </section>

          {/* Layer 5 — deeper inside, how it works (80–100%) */}
          <section
            id="how"
            className="flex min-h-screen items-center px-4 py-16 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <PalaceContentPanel dark className="p-7 sm:p-10">
                <Reveal>
                  <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    How it works
                  </h2>
                </Reveal>
                <StaggerContainer
                  as="ol"
                  className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6"
                  stagger={0.1}
                >
                  {steps.map((step) => (
                    <StaggerItem key={step.n} as="li" className="relative">
                      <p className="font-display text-3xl font-semibold text-gold/80">{step.n}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-ivory/75">
                        {step.description}
                      </p>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </PalaceContentPanel>
            </div>
          </section>
        </div>
      </div>

      <TestLandingFooter note="Palace scroll experiment — /test-landing-v2 only" />
    </div>
  )
}

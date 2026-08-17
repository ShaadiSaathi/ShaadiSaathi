"use client"

import Link from "next/link"
import TestLandingNav from "@/components/test-redesign/TestLandingNav"
import { Reveal, StaggerContainer, StaggerItem } from "@/components/test-redesign/scroll-motion"

const heroPoints = [
  "One shared space for every ceremony",
  "Guest lists, RSVPs, and seating without WhatsApp chaos",
  "Vendors and bookings in the same plan",
]

const trustBadges = [
  {
    label: "Built for mehndi to walima",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Family collaboration",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="15.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4.5 18c.8-2.4 2.7-3.8 4.5-3.8S12.7 15.6 13.5 18M13 14.5c1.1-.5 2.4-.6 3.6.1 1.4.8 2.3 2.3 2.9 3.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Secure deposits",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v5.5c0 4.2-2.8 7.2-7 9-4.2-1.8-7-4.8-7-9V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12l1.8 1.8L15 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "UK & South Asia ready",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4.5 12h15M12 4.5c2.2 2.4 3.3 4.9 3.3 7.5S14.2 17.1 12 19.5C9.8 17.1 8.7 14.6 8.7 12S9.8 6.9 12 4.5z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
]

const offers = [
  {
    tag: "Families",
    title: "Plan every event together",
    description: "Mehndi, baraat, and walima timelines in one shared wedding hub.",
    href: "/signup",
    linkLabel: "Start planning",
  },
  {
    tag: "Guests",
    title: "RSVPs that actually arrive",
    description: "Invite links, meal choices, and seating updates without chasing chats.",
    href: "/signup",
    linkLabel: "See guest tools",
  },
  {
    tag: "Vendors",
    title: "Get booking-ready requests",
    description: "Families reach you with dates, budgets, and ceremony context already set.",
    href: "/vendor/signup",
    linkLabel: "List your business",
  },
]

const trustPoints = [
  "Clear ownership — wedding owners and collaborators stay in sync",
  "Transparent booking status for deposits and balances",
  "No surprise vendor fees invented by the assistant",
  "Premium AI grounded in wedding knowledge, not generic chat",
  "You stay in control of who can edit guest lists and payments",
]

const steps = [
  {
    n: "01",
    title: "Create your wedding",
    description: "Add ceremonies, invite family collaborators, and set your planning baseline.",
  },
  {
    n: "02",
    title: "Organise guests & vendors",
    description: "Build lists, send invites, and collect booking requests in one place.",
  },
  {
    n: "03",
    title: "Walk into every event ready",
    description: "Schedules, seating, and payments stay current through mehndi to walima.",
  },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-gold" fill="none" aria-hidden>
      <path
        d="M4.5 10.5l3.2 3.2 7.8-7.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function TestLandingPage() {
  return (
    <div className="shaadi-saathi min-h-screen bg-ivory text-maroon-dark">
      <TestLandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-maroon/8">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 15% 0%, color-mix(in srgb, var(--gold) 18%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 20%, color-mix(in srgb, var(--maroon) 10%, transparent), transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
            <Reveal>
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-gold-dark">
                South Asian wedding planning
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.12] font-semibold tracking-tight text-maroon-dark sm:text-5xl lg:text-[3.25rem]">
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
              className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-maroon/8 pt-6"
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
          </div>
        </section>

        {/* Featured offers — horizontal swipe */}
        <section id="offers" className="border-b border-maroon/8 py-10 sm:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mb-4 flex items-end justify-between gap-4">
              <h2 className="font-display text-lg font-semibold text-maroon-dark sm:text-xl">
                Featured for your wedding week
              </h2>
              <p className="hidden font-sans text-xs text-maroon/40 sm:block">Swipe for more →</p>
            </Reveal>
            <StaggerContainer
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
              stagger={0.1}
            >
              {offers.map((offer) => (
                <StaggerItem
                  key={offer.title}
                  as="article"
                  className="w-[min(85vw,20rem)] shrink-0 snap-start rounded-3xl bg-white/70 p-5 shadow-sm shadow-maroon/5 ring-1 ring-maroon/8 sm:w-[18.5rem]"
                >
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
                </StaggerItem>
              ))}
            </StaggerContainer>
            <p className="mt-3 font-sans text-xs text-maroon/40 sm:hidden">Swipe for more →</p>
          </div>
        </section>

        {/* Choose the right option */}
        <section id="paths" className="border-b border-maroon/8 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-maroon-dark sm:text-4xl">
                Choose the right starting point
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-maroon/65">
                Whether you&apos;re coordinating a multi-event wedding or listing a service
                families can book, Shaadi Saathi keeps both sides on the same page.
              </p>
            </Reveal>

            <StaggerContainer className="mt-10 grid gap-5 md:grid-cols-2" stagger={0.12}>
              <StaggerItem as="article">
                <article className="h-full rounded-3xl bg-gradient-to-br from-maroon to-maroon-dark p-7 text-ivory shadow-lg shadow-maroon/20 sm:p-8">
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
                <article className="h-full rounded-3xl bg-white/80 p-7 shadow-sm shadow-maroon/5 ring-1 ring-maroon/10 sm:p-8">
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
                </article>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* Secondary services teaser */}
        <section className="border-b border-maroon/8 py-10 sm:py-12">
          <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="max-w-3xl font-sans text-base leading-relaxed text-maroon/70">
              Looking for seating charts, task boards, wedding AI guidance, or premium
              themes? Explore the full planning toolkit once you&apos;re signed in — or
              browse vendor categories first.{" "}
              <Link
                href="/vendors"
                className="font-medium text-maroon underline decoration-gold/40 underline-offset-2 hover:decoration-maroon"
              >
                View the vendor catalogue
              </Link>
            </p>
          </Reveal>
        </section>

        {/* Trust / pricing credibility */}
        <section id="trust" className="border-b border-maroon/8 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-maroon-dark sm:text-4xl">
                Clear, calm, and credible
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-maroon/65">
                We keep planning tools straightforward and payments transparent — so
                families and vendors know where things stand without chasing updates.
              </p>
            </Reveal>

            <StaggerContainer as="ul" className="mt-8 max-w-2xl space-y-3.5" stagger={0.07}>
              {trustPoints.map((point) => (
                <StaggerItem
                  key={point}
                  as="li"
                  className="flex gap-3 font-sans text-sm leading-relaxed text-maroon-dark/85"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
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
                className="mt-8 inline-flex font-sans text-sm font-medium text-maroon underline decoration-gold/40 underline-offset-4 hover:decoration-maroon"
              >
                See premium planning features →
              </Link>
            </Reveal>
          </div>
        </section>

        {/* How it works — 3 steps */}
        <section id="how" className="py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-maroon-dark sm:text-4xl">
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
                  <p className="font-display text-3xl font-semibold text-gold/70">{step.n}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-maroon-dark">
                    {step.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-maroon/65">
                    {step.description}
                  </p>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      </main>

      {/* Compact footer */}
      <footer className="border-t border-maroon/10 bg-maroon-dark text-ivory/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 font-sans text-xs leading-relaxed sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:px-6">
          <span className="font-display text-sm font-semibold text-ivory">Shaadi Saathi</span>
          <span className="hidden text-ivory/30 sm:inline">·</span>
          <span>hello@shaadisaathi.com</span>
          <span className="hidden text-ivory/30 sm:inline">·</span>
          <span>London, United Kingdom</span>
          <span className="hidden text-ivory/30 sm:inline">·</span>
          <span>Support: Mon–Fri 9:00–18:00 GMT</span>
          <span className="mt-1 w-full text-ivory/40 sm:mt-0 sm:ml-auto sm:w-auto">
            Test layout only — not linked from the live site
          </span>
        </div>
      </footer>
    </div>
  )
}

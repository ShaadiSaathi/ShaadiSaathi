import Link from "next/link"
import type { ReactNode } from "react"

export const heroPoints = [
  "One shared space for every ceremony",
  "Guest lists, RSVPs, and seating without WhatsApp chaos",
  "Vendors and bookings in the same plan",
]

export const trustBadges = [
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

export const offers = [
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

export const trustPoints = [
  "Clear ownership — wedding owners and collaborators stay in sync",
  "Transparent booking status for deposits and balances",
  "No surprise vendor fees invented by the assistant",
  "Premium AI grounded in wedding knowledge, not generic chat",
  "You stay in control of who can edit guest lists and payments",
]

export const steps = [
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

export function CheckIcon() {
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

export function TestLandingFooter({ note }: { note?: string }) {
  return (
    <footer className="border-t border-maroon/10 bg-maroon-dark text-ivory/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 font-sans text-xs leading-relaxed sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:px-6">
        <span className="font-display text-sm font-semibold text-ivory">Shaadi Saathi</span>
        <span className="hidden text-ivory/30 sm:inline">·</span>
        <span>hello@shaadisaathi.com</span>
        <span className="hidden text-ivory/30 sm:inline">·</span>
        <span>London, United Kingdom</span>
        <span className="hidden text-ivory/30 sm:inline">·</span>
        <span>Support: Mon–Fri 9:00–18:00 GMT</span>
        {note ? (
          <span className="mt-1 w-full text-ivory/40 sm:mt-0 sm:ml-auto sm:w-auto">{note}</span>
        ) : null}
      </div>
    </footer>
  )
}

/** Glass panel for legibility over the palace background */
export function PalaceContentPanel({
  children,
  className = "",
  dark = false,
}: {
  children: ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <div
      className={`rounded-3xl border shadow-xl backdrop-blur-md ${
        dark
          ? "border-ivory/15 bg-maroon/75 text-ivory"
          : "border-white/30 bg-white/92 text-maroon-dark shadow-maroon/10"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CatalogueTeaser({ className = "" }: { className?: string }) {
  return (
    <p className={`font-sans text-base leading-relaxed ${className}`}>
      Looking for seating charts, task boards, wedding AI guidance, or premium themes? Explore
      the full planning toolkit once you&apos;re signed in — or browse vendor categories first.{" "}
      <Link
        href="/vendors"
        className="font-medium underline decoration-gold/50 underline-offset-2 hover:decoration-gold"
      >
        View the vendor catalogue
      </Link>
    </p>
  )
}

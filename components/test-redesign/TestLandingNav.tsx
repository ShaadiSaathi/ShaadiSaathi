"use client"

import Link from "next/link"
import { motion, useMotionValueEvent, useScroll } from "framer-motion"
import { useState } from "react"

const navLinks = [
  { href: "/test-dashboard", label: "Dashboard" },
  { href: "/test-guests", label: "Guests" },
  { href: "/test-vendors", label: "Vendors" },
  { href: "/test-events", label: "Events" },
  { href: "/test-upgrade", label: "Upgrade" },
] as const

export default function TestLandingNav() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 48)
  })

  return (
    <motion.header
      className={`sticky top-0 z-40 border-b transition-[background-color,backdrop-filter,border-color] duration-300 motion-reduce:transition-none ${
        scrolled
          ? "border-maroon/8 bg-ivory/90 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/test-landing"
          className="font-display text-xl font-semibold tracking-tight text-maroon-dark"
        >
          Shaadi Saathi
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Test landing">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-sans text-sm text-maroon/70 transition hover:text-maroon"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 font-sans text-sm font-medium text-maroon transition hover:bg-maroon/5 sm:px-4"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-maroon px-3 py-2 font-sans text-sm font-medium text-ivory shadow-sm shadow-maroon/15 transition hover:bg-maroon-dark sm:px-4"
          >
            Start free
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

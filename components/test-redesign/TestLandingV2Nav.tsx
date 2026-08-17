"use client"

import Link from "next/link"
import { motion, useMotionValueEvent, useScroll } from "framer-motion"
import { useState } from "react"

const navLinks = [
  { href: "#offers", label: "Offers" },
  { href: "#paths", label: "Paths" },
  { href: "#trust", label: "Trust" },
  { href: "#how", label: "How it works" },
] as const

export default function TestLandingV2Nav() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 48)
  })

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,backdrop-filter,border-color] duration-300 motion-reduce:transition-none ${
        scrolled
          ? "border-maroon/8 bg-ivory/92 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/test-landing-v2"
          className={`font-display text-xl font-semibold tracking-tight transition-colors ${
            scrolled ? "text-maroon-dark" : "text-ivory"
          }`}
        >
          Shaadi Saathi
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Palace landing">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`font-sans text-sm transition ${
                scrolled
                  ? "text-maroon/70 hover:text-maroon"
                  : "text-ivory/85 hover:text-ivory"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={`rounded-full px-3 py-2 font-sans text-sm font-medium transition sm:px-4 ${
              scrolled
                ? "text-maroon hover:bg-maroon/5"
                : "text-ivory/90 hover:bg-ivory/10"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={`rounded-full px-3 py-2 font-sans text-sm font-medium shadow-sm transition sm:px-4 ${
              scrolled
                ? "bg-maroon text-ivory shadow-maroon/15 hover:bg-maroon-dark"
                : "bg-ivory text-maroon shadow-ivory/20 hover:bg-white"
            }`}
          >
            Start free
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

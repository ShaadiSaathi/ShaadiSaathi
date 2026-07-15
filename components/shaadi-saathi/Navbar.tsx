"use client"

import Link from "next/link"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import type { LandingRole } from "./landing/RoleToggle"

const FAMILY_NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#testimonials", label: "Families" },
] as const

interface NavbarProps {
  role?: LandingRole
  onRoleChange?: (role: LandingRole) => void
}

export default function Navbar({ role = "family", onRoleChange }: NavbarProps) {
  const { isFamilyLoggedIn, isVendorLoggedIn } = useAuth()
  const loginHref =
    role === "vendor"
      ? isVendorLoggedIn
        ? "/vendor/dashboard"
        : "/vendor/login"
      : isFamilyLoggedIn
        ? "/dashboard"
        : "/login"
  return (
    <nav
      className="sticky top-0 z-50 border-b border-gold/15 bg-ivory/90 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-display text-xl font-bold text-maroon-dark transition-colors hover:text-maroon"
        >
          Shaadi Saathi
        </Link>

        <ul className="hidden items-center gap-6 text-sm font-medium text-maroon/80 sm:flex">
          {role === "family" &&
            FAMILY_NAV.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-gold-dark">
                  {link.label}
                </a>
              </li>
            ))}
          <li>
            {role === "family" ? (
              <button
                type="button"
                onClick={() => onRoleChange?.("vendor")}
                className="transition-colors hover:text-gold-dark"
              >
                For Vendors
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRoleChange?.("family")}
                className="transition-colors hover:text-gold-dark"
              >
                For Families
              </button>
            )}
          </li>
        </ul>

        <div className="flex items-center gap-3 sm:gap-2">
          <Link
            href={loginHref}
            className="inline-flex min-h-[44px] items-center rounded-full border border-gold/30 px-4 text-sm font-medium text-maroon hover:bg-gold/10 sm:hidden"
          >
            Log in
          </Link>
          <Link
            href={loginHref}
            className="hidden rounded-full border border-gold/30 px-4 py-2 text-sm font-medium text-maroon hover:bg-gold/10 sm:inline-block"
          >
            {role === "vendor" ? "Vendor Login" : "Family Login"}
          </Link>
          <Link
            href={role === "vendor" ? "/vendor/signup" : "/signup"}
            className="inline-flex items-center justify-center rounded-full bg-gold px-5 py-2 text-sm font-semibold text-maroon-dark shadow-sm shadow-gold/20 transition-all hover:scale-[1.03] hover:shadow-md hover:shadow-gold/30 max-sm:min-h-[44px]"
          >
            {role === "vendor" ? "List Business" : "Get Started"}
          </Link>
        </div>
      </div>
    </nav>
  )
}

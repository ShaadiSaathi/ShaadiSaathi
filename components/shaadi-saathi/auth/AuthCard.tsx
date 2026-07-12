"use client"

import Link from "next/link"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"

interface AuthCardProps {
  variant?: "family" | "vendor"
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Shared split-screen auth layout — form card + decorative panel */
export default function AuthCard({
  variant = "family",
  title,
  subtitle,
  badge,
  children,
  footer,
}: AuthCardProps) {
  const isVendor = variant === "vendor"

  return (
    <div className="shaadi-saathi relative min-h-screen bg-ivory">
      <MehndiPattern opacity={0.035} />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        {/* Decorative panel — desktop */}
        <div
          className={`relative hidden overflow-hidden lg:flex lg:w-[42%] lg:flex-col lg:justify-center lg:px-12 xl:px-16 ${
            isVendor
              ? "bg-gradient-to-br from-maroon-dark via-[#3d1530] to-maroon-dark"
              : "bg-gradient-to-br from-maroon via-maroon-dark to-[#3d1530]"
          }`}
          aria-hidden="true"
        >
          <div className="absolute inset-0 opacity-[0.07]">
            <MehndiPattern opacity={1} />
          </div>
          <div className="relative">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold/80">
              {isVendor ? "Vendor portal" : "Shaadi Saathi"}
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-ivory xl:text-4xl">
              {isVendor
                ? "Grow your wedding business with real families"
                : "Every event. Every guest. One place."}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/70">
              {isVendor
                ? "Manage bookings, check-ins, and earnings — all in one professional workspace."
                : "Plan mehndi, baraat, and walima without the WhatsApp chaos."}
            </p>
            <div className="mt-10 h-px w-16 bg-gold/40" />
          </div>
        </div>

        {/* Form side */}
        <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <Link
            href="/"
            className="mb-8 block text-center font-display text-xl font-bold text-maroon-dark lg:text-left"
          >
            Shaadi Saathi
          </Link>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-gold/20 bg-white/90 p-7 shadow-sm shadow-maroon/5 backdrop-blur-sm sm:p-8">
            {badge && (
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-gold-dark lg:text-left">
                {badge}
              </p>
            )}
            <h1 className="mt-1 text-center font-display text-2xl font-bold text-maroon-dark lg:text-left">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-center text-sm text-maroon/60 lg:text-left">{subtitle}</p>
            )}

            <div className="mt-7">{children}</div>

            {footer && <div className="mt-6 border-t border-gold/10 pt-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

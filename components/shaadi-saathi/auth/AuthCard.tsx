"use client"

import Link from "next/link"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import SignupFlowProgress from "@/components/shaadi-saathi/auth/SignupFlowProgress"
import SignupPremiumBackdrop from "@/components/shaadi-saathi/auth/SignupPremiumBackdrop"

export interface SignupProgressConfig {
  step: number
  total?: number
}

interface AuthCardProps {
  variant?: "family" | "vendor"
  /** Lahore Fort premium backdrop — family signup flow only */
  premium?: boolean
  progress?: SignupProgressConfig
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Shared auth layout — standard split-screen or premium signup shell */
export default function AuthCard({
  variant = "family",
  premium = false,
  progress,
  title,
  subtitle,
  badge,
  children,
  footer,
}: AuthCardProps) {
  const isVendor = variant === "vendor"

  if (premium) {
    return (
      <div className="shaadi-saathi relative min-h-[100dvh] safe-top safe-bottom">
        <SignupPremiumBackdrop />

        <div className="relative z-10 flex min-h-[100dvh] flex-col overflow-y-auto overscroll-y-contain px-4 py-6 sm:justify-center sm:py-10">
          <div className="mx-auto w-full max-w-md pb-safe">
            <Link
              href="/"
              className="mb-5 block text-center font-display text-xl font-bold text-ivory/95 sm:mb-6"
            >
              Shaadi Saathi
            </Link>

            <div className="shaadi-auth-card p-6 sm:p-8">
              {progress ? (
                <SignupFlowProgress step={progress.step} total={progress.total} />
              ) : null}
              {badge ? (
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
                  {badge}
                </p>
              ) : null}
              <h1 className={`shaadi-page-title ${badge ? "mt-1" : ""}`}>{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-maroon/60">{subtitle}</p>
              ) : null}

              <div className="mt-6 sm:mt-7">{children}</div>

              {footer ? (
                <div className="mt-6 border-t border-gold/10 pt-6">{footer}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shaadi-saathi relative min-h-screen bg-ivory safe-top safe-bottom">
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
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 xl:px-16">
          <Link
            href="/"
            className="mb-6 block text-center font-display text-xl font-bold text-maroon-dark sm:mb-8 lg:text-left"
          >
            Shaadi Saathi
          </Link>

          <div className="mx-auto w-full max-w-md shaadi-card p-6 sm:p-8">
            {badge && (
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-gold-dark lg:text-left">
                {badge}
              </p>
            )}
            <h1 className="shaadi-page-title mt-1 text-center lg:text-left">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-center text-sm leading-relaxed text-maroon/60 lg:text-left">
                {subtitle}
              </p>
            )}

            <div className="mt-6 sm:mt-7">{children}</div>

            {footer && <div className="mt-6 border-t border-gold/10 pt-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

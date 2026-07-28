"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthCard from "@/components/shaadi-saathi/auth/AuthCard"
import FirebaseOtpGate from "@/components/shaadi-saathi/auth/FirebaseOtpGate"
import { useAuth, type PendingFlow } from "@/components/shaadi-saathi/auth/AuthContext"
import {
  readPersistedPending,
  type PersistedPending,
} from "@/lib/auth/pending-session"

type VerifyKind = "family-signup" | "family-login" | "vendor-signup" | "vendor-login"

const CONFIG: Record<
  VerifyKind,
  {
    flow: Exclude<PendingFlow, null>
    backHref: string
    successHref: string
    variant: "family" | "vendor"
    badge?: string
    subtitle: string
    backLabel: string
  }
> = {
  "family-signup": {
    flow: "family-signup",
    backHref: "/signup",
    successHref: "/signup/onboarding",
    variant: "family",
    subtitle: "Confirm the security check below — then we'll text a 6-digit code.",
    backLabel: "Go back",
  },
  "family-login": {
    flow: "family-login",
    backHref: "/login",
    successHref: "/dashboard",
    variant: "family",
    subtitle: "Confirm the security check below — then enter the code we text you.",
    backLabel: "Back to login",
  },
  "vendor-signup": {
    flow: "vendor-signup",
    backHref: "/vendor/signup",
    successHref: "/vendor/signup/onboarding",
    variant: "vendor",
    badge: "Vendor portal",
    subtitle: "Confirm the security check below — then we'll text a 6-digit code.",
    backLabel: "Go back",
  },
  "vendor-login": {
    flow: "vendor-login",
    backHref: "/vendor/login",
    successHref: "/vendor/dashboard",
    variant: "vendor",
    badge: "Vendor portal",
    subtitle: "Confirm the security check below — then enter the code we text you.",
    backLabel: "Back to login",
  },
}

interface PhoneVerifyPageProps {
  kind: VerifyKind
}

function peekStoredPending(flow: PersistedPending["flow"]) {
  const stored = readPersistedPending()
  if (!stored || stored.flow !== flow || !stored.phone) return null
  return stored
}

/**
 * Shared phone OTP verify screen for family + vendor login/signup.
 * Keeps vendor and family on the same FirebaseOtpGate path so fixes can't drift.
 */
export default function PhoneVerifyPage({ kind }: PhoneVerifyPageProps) {
  const router = useRouter()
  const { pending, hydratePending, verifyOtp, confirmOtp, resolveFamilyPostVerifyPath } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const config = CONFIG[kind]
  const flow = config.flow

  // Sync read of sessionStorage (no setState) covers the soft-nav race where
  // loginFamily wrote storage but React hasn't flushed context pending yet.
  const stored = peekStoredPending(flow)
  const activePhone =
    pending?.flow === flow && pending.phone
      ? pending.phone
      : stored?.phone ?? null

  useEffect(() => {
    if (pending?.flow === flow && pending.phone) return
    hydratePending(flow)
  }, [pending, flow, hydratePending])

  useEffect(() => {
    if (activePhone) return
    const t = window.setTimeout(() => {
      if (!hydratePending(flow)?.phone && !peekStoredPending(flow)) {
        router.replace(config.backHref)
      }
    }, 600)
    return () => window.clearTimeout(t)
  }, [activePhone, hydratePending, flow, router, config.backHref])

  if (!activePhone) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-maroon/50">
        Preparing verification…
      </div>
    )
  }

  async function handleVerify(code: string) {
    setError(null)
    if (!verifyOtp(code)) {
      setError("Please enter a valid 6-digit code")
      return
    }
    setLoading(true)
    try {
      await confirmOtp(code)
      if (kind === "family-signup" || kind === "family-login") {
        const href = await resolveFamilyPostVerifyPath(kind)
        router.push(href)
      } else {
        router.push(config.successHref)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That code isn't correct. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      variant={config.variant}
      badge={config.badge}
      title="Verify your number"
      subtitle={config.subtitle}
      footer={
        kind.endsWith("signup") ? (
          <p className="text-center text-sm text-maroon/60">
            Wrong number?{" "}
            <Link
              href={config.backHref}
              className="font-semibold text-maroon hover:text-gold-dark"
            >
              {config.backLabel}
            </Link>
          </p>
        ) : undefined
      }
    >
      <FirebaseOtpGate
        phone={activePhone}
        onVerify={handleVerify}
        verifyLoading={loading}
        verifyError={error}
      />
      {kind.endsWith("login") && (
        <p className="mt-4 text-center text-sm text-maroon/60">
          <Link
            href={config.backHref}
            className="font-semibold text-maroon hover:text-gold-dark"
          >
            {config.backLabel}
          </Link>
        </p>
      )}
    </AuthCard>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Credential and mode checks for Stripe + Safepay. Prefer missing-credential
 * failures over silent mock success. Live keys are blocked unless both
 * PAYMENTS_ALLOW_LIVE=true and PAYMENTS_PRODUCTION_SIGN_OFF match the
 * exact confirmation string below.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  PAYMENTS_UNAVAILABLE_MESSAGE,
  PaymentsNotConfiguredError,
  PaymentsSafetyError,
  type PaymentsAvailability,
} from "./types"

/** Must match exactly — intentional friction before live money movement. */
export const PRODUCTION_SIGN_OFF_VALUE = "I_CONFIRM_REAL_PAYMENTS"

const STRIPE_TEST_SECRET_PREFIX = "sk_test_"
const STRIPE_LIVE_SECRET_PREFIX = "sk_live_"
const STRIPE_TEST_PUBLISHABLE_PREFIX = "pk_test_"
const STRIPE_LIVE_PUBLISHABLE_PREFIX = "pk_live_"

export function getStripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY?.trim() || "pkr").toLowerCase()
}

/** Stripe zero-decimal currencies (amount is whole units, not cents/paisa). */
const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
  // Note: PKR is NOT zero-decimal — Stripe expects amount in paisa (×100).
])

export function toStripeAmountUnits(amountPkr: number, currency = getStripeCurrency()): number {
  const rounded = Math.round(amountPkr)
  if (rounded < 1) {
    throw new Error("Payment amount must be at least 1")
  }
  if (ZERO_DECIMAL.has(currency.toLowerCase())) {
    return rounded
  }
  return rounded * 100
}

export function fromStripeAmountUnits(
  stripeAmount: number,
  currency = getStripeCurrency()
): number {
  if (ZERO_DECIMAL.has(currency.toLowerCase())) {
    return stripeAmount
  }
  return Math.round(stripeAmount / 100)
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export function hasProductionSignOff(): boolean {
  return (
    process.env.PAYMENTS_ALLOW_LIVE === "true" &&
    process.env.PAYMENTS_PRODUCTION_SIGN_OFF === PRODUCTION_SIGN_OFF_VALUE
  )
}

export function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === "production"
}

/**
 * Known production Firebase project for Shaadi Saathi.
 * Payments must not run here until explicit production sign-off — a prior
 * incident shipped unready credentials to production.
 */
export const PRODUCTION_FIREBASE_PROJECT_ID = "shaadi-saathi-dd3da"

export function getFirebaseProjectId(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    undefined
  )
}

export function isFirebaseProductionProject(): boolean {
  return getFirebaseProjectId() === PRODUCTION_FIREBASE_PROJECT_ID
}

/**
 * Block family payment collection on the production Firebase / Vercel
 * production environment unless dual sign-off is present.
 */
export function assertPaymentsEnvironmentAllowed(): void {
  if (hasProductionSignOff()) {
    if (isVercelProduction() && process.env.PAYMENTS_FORCE_PRODUCTION !== "true") {
      throw new PaymentsSafetyError(
        "Payments on Vercel production also require PAYMENTS_FORCE_PRODUCTION=true after explicit sign-off."
      )
    }
    return
  }

  if (isVercelProduction()) {
    throw new PaymentsSafetyError(
      "Payments are blocked on Vercel production until explicit sign-off. Use staging (shaadisaathistaging) with test keys."
    )
  }

  if (isFirebaseProductionProject()) {
    throw new PaymentsSafetyError(
      "Payments are blocked while this app is pointed at the production Firebase project (shaadi-saathi-dd3da). Switch NEXT_PUBLIC_FIREBASE_PROJECT_ID to shaadisaathistaging (and matching Admin credentials) before collecting payments."
    )
  }
}

function classifyStripeSecret(secret: string | undefined): "missing" | "test" | "live" | "invalid" {
  if (!secret) return "missing"
  if (secret.startsWith(STRIPE_TEST_SECRET_PREFIX)) return "test"
  if (secret.startsWith(STRIPE_LIVE_SECRET_PREFIX)) return "live"
  return "invalid"
}

function classifyStripePublishable(
  key: string | undefined
): "missing" | "test" | "live" | "invalid" {
  if (!key) return "missing"
  if (key.startsWith(STRIPE_TEST_PUBLISHABLE_PREFIX)) return "test"
  if (key.startsWith(STRIPE_LIVE_PUBLISHABLE_PREFIX)) return "live"
  return "invalid"
}

/**
 * Live keys are never used unless explicit dual sign-off is present.
 * On Vercel production, refuse even with sign-off unless you also set
 * PAYMENTS_FORCE_PRODUCTION=true (extra belt-and-suspenders).
 */
export function assertStripeKeysSafe(
  secret: string,
  publishable: string
): void {
  const secretKind = classifyStripeSecret(secret)
  const pubKind = classifyStripePublishable(publishable)

  if (secretKind === "invalid" || pubKind === "invalid") {
    throw new PaymentsSafetyError(
      "Stripe keys look invalid. Use sk_test_/pk_test_ keys for staging."
    )
  }

  if (secretKind === "live" || pubKind === "live") {
    if (!hasProductionSignOff()) {
      throw new PaymentsSafetyError(
        "Live Stripe keys are blocked. Use test keys (sk_test_/pk_test_), or set PAYMENTS_ALLOW_LIVE=true and PAYMENTS_PRODUCTION_SIGN_OFF=I_CONFIRM_REAL_PAYMENTS after explicit sign-off."
      )
    }
    if (isVercelProduction() && process.env.PAYMENTS_FORCE_PRODUCTION !== "true") {
      throw new PaymentsSafetyError(
        "Live Stripe keys on Vercel production also require PAYMENTS_FORCE_PRODUCTION=true. Do not enable until you have personally tested staging."
      )
    }
  }
}

export function getStripeCredentials():
  | { ok: true; secretKey: string; publishableKey: string }
  | { ok: false; reason: string } {
  const secretKey = env("STRIPE_SECRET_KEY")
  const publishableKey =
    env("STRIPE_PUBLISHABLE_KEY") || env("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")

  if (!secretKey || !publishableKey) {
    return { ok: false, reason: PAYMENTS_UNAVAILABLE_MESSAGE }
  }

  try {
    assertStripeKeysSafe(secretKey, publishableKey)
    assertPaymentsEnvironmentAllowed()
  } catch (error) {
    if (error instanceof PaymentsSafetyError) {
      return { ok: false, reason: error.message }
    }
    throw error
  }

  return { ok: true, secretKey, publishableKey }
}

export function getSafepayCredentials():
  | {
      ok: true
      apiKey: string
      secretKey: string
      aggregatorId: string
      baseUrl: string
      isSandbox: boolean
    }
  | { ok: false; reason: string } {
  const apiKey = env("SAFEPAY_API_KEY")
  const secretKey = env("SAFEPAY_SECRET_KEY")
  const aggregatorId = env("SAFEPAY_AGGREGATOR_ID")

  // Raastwire payouts use aggregator id + secret; API key is required as a
  // presence check so half-configured envs never attempt a live call.
  if (!apiKey || !secretKey || !aggregatorId) {
    return { ok: false, reason: PAYMENTS_UNAVAILABLE_MESSAGE }
  }

  const sandboxBase = "https://dev.api.getsafepay.com/raastwire"
  const productionBase = "https://api.getsafepay.com/raastwire"
  const configuredBase = env("SAFEPAY_BASE_URL")

  let baseUrl = configuredBase || sandboxBase
  let isSandbox = !baseUrl.includes("://api.getsafepay.com")

  if (!isSandbox) {
    if (!hasProductionSignOff()) {
      return {
        ok: false,
        reason:
          "Safepay production base URL is blocked. Use https://dev.api.getsafepay.com/raastwire (sandbox) until explicit production sign-off.",
      }
    }
    if (isVercelProduction() && process.env.PAYMENTS_FORCE_PRODUCTION !== "true") {
      return {
        ok: false,
        reason:
          "Safepay production on Vercel also requires PAYMENTS_FORCE_PRODUCTION=true.",
      }
    }
  }

  // Prefer sandbox unless sign-off explicitly allows production URL
  if (!hasProductionSignOff() && configuredBase?.includes("://api.getsafepay.com")) {
    return {
      ok: false,
      reason:
        "Refusing Safepay production URL without PAYMENTS_ALLOW_LIVE + PAYMENTS_PRODUCTION_SIGN_OFF.",
    }
  }

  if (!configuredBase) {
    baseUrl = sandboxBase
    isSandbox = true
  }

  return {
    ok: true,
    apiKey,
    secretKey,
    aggregatorId,
    baseUrl,
    isSandbox,
  }
}

export function getPaymentsAvailability(): PaymentsAvailability {
  const stripe = getStripeCredentials()
  const safepay = getSafepayCredentials()

  const stripeOk = stripe.ok
  const safepayOk = safepay.ok

  if (!stripeOk && !safepayOk) {
    const reason =
      (!stripe.ok && stripe.reason) ||
      (!safepay.ok && safepay.reason) ||
      PAYMENTS_UNAVAILABLE_MESSAGE
    return {
      stripe: false,
      safepay: false,
      canCollect: false,
      canPayout: false,
      mode: "unconfigured",
      message: reason,
      publishableKey: null,
      currency: getStripeCurrency(),
    }
  }

  const blocked =
    (!stripeOk && Boolean(env("STRIPE_SECRET_KEY"))) ||
    (!safepayOk && Boolean(env("SAFEPAY_SECRET_KEY")))

  return {
    stripe: stripeOk,
    safepay: safepayOk,
    canCollect: stripeOk,
    canPayout: safepayOk,
    mode: blocked ? "blocked_live" : "test",
    message: stripeOk
      ? safepayOk
        ? null
        : "Family payments (Stripe) are ready in test mode. Vendor payouts (Safepay) are not yet configured."
      : !stripe.ok
        ? stripe.reason
        : PAYMENTS_UNAVAILABLE_MESSAGE,
    publishableKey: stripe.ok ? stripe.publishableKey : null,
    currency: getStripeCurrency(),
  }
}

export function requireStripeConfigured(): {
  secretKey: string
  publishableKey: string
} {
  const creds = getStripeCredentials()
  if (!creds.ok) {
    throw new PaymentsNotConfiguredError(creds.reason)
  }
  return { secretKey: creds.secretKey, publishableKey: creds.publishableKey }
}

export function requireSafepayConfigured(): {
  apiKey: string
  secretKey: string
  aggregatorId: string
  baseUrl: string
  isSandbox: boolean
} {
  const creds = getSafepayCredentials()
  if (!creds.ok) {
    throw new PaymentsNotConfiguredError(creds.reason)
  }
  return creds
}

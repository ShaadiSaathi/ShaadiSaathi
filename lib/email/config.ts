/**
 * Email delivery (Resend) — optional. Missing keys must never break payments
 * or bookings; same fail-soft pattern as Twilio / Stripe / Safepay.
 */

export const EMAIL_NOT_CONFIGURED_MESSAGE =
  "Email delivery not yet configured"

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

/** From address. Prefer a verified domain in production; Resend onboarding domain for early staging. */
export function getEmailFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (configured) return configured
  return "Shaadi Saathi <onboarding@resend.dev>"
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  // Practical validation — not RFC-perfect
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null
  if (trimmed.length > 254) return null
  return trimmed
}

export type OtpChannel = "whatsapp" | "sms"

export type OtpFlow =
  | "family-signup"
  | "family-login"
  | "vendor-signup"
  | "vendor-login"
  | "family-reset"
  | "vendor-reset"
  | "unknown"

export const OTP_CHANNELS: readonly OtpChannel[] = ["whatsapp", "sms"] as const

export const OTP_FLOWS: readonly OtpFlow[] = [
  "family-signup",
  "family-login",
  "vendor-signup",
  "vendor-login",
  "family-reset",
  "vendor-reset",
  "unknown",
] as const

/** E.164: leading +, 8–15 digits total after +. */
const E164_RE = /^\+[1-9]\d{7,14}$/
const CODE_RE = /^\d{6}$/

export function isOtpChannel(value: unknown): value is OtpChannel {
  return typeof value === "string" && (OTP_CHANNELS as readonly string[]).includes(value)
}

export function isOtpFlow(value: unknown): value is OtpFlow {
  return typeof value === "string" && (OTP_FLOWS as readonly string[]).includes(value)
}

export function normalizeE164(phone: unknown): string | null {
  if (typeof phone !== "string") return null
  const trimmed = phone.trim()
  if (!E164_RE.test(trimmed)) return null
  return trimmed
}

export function normalizeOtpCode(code: unknown): string | null {
  if (typeof code !== "string") return null
  const trimmed = code.trim()
  if (!CODE_RE.test(trimmed)) return null
  return trimmed
}

export class OtpApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = "OtpApiError"
    this.code = code
    this.status = status
  }
}

export const OTP_FRIENDLY: Record<string, string> = {
  "otp/not-configured":
    "Verification isn't set up yet. Please try again later.",
  "otp/invalid-phone":
    "That phone number doesn't look right. Please go back and check it.",
  "otp/invalid-code":
    "That code isn't correct. Please re-check the 6 digits and try again.",
  "otp/invalid-channel": "Please choose WhatsApp or SMS and try again.",
  "otp/invalid-body": "Something went wrong. Please try again.",
  "otp/send-failed":
    "We couldn't send your code. Please tap Retry, or try SMS instead.",
  "otp/check-failed":
    "We couldn't verify that code. Please try again or request a new one.",
  "otp/code-expired": "That code has expired. Tap Resend to get a new one.",
  "otp/too-many-requests":
    "Too many attempts. Please wait a little while, then tap Retry.",
  "otp/network": "Network problem — check your connection and try again.",
  "otp/auth-failed":
    "We verified your code but couldn't sign you in. Please try again.",
}

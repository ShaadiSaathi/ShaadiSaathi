/**
 * Friendly, user-facing messages for Firebase phone-auth failures, plus a
 * timeout helper so a stuck "send code" request can surface a retry button
 * instead of hanging forever.
 */

export class AuthTimeoutError extends Error {
  readonly code = "timeout"
  constructor(message = "Verification request timed out") {
    super(message)
    this.name = "AuthTimeoutError"
  }
}

/** Reject with an AuthTimeoutError if `promise` doesn't settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthTimeoutError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function extractCode(err: unknown): string {
  if (err instanceof AuthTimeoutError) return "timeout"
  if (typeof err === "object" && err !== null) {
    const maybe = err as { code?: unknown; message?: unknown }
    if (typeof maybe.code === "string" && maybe.code) return maybe.code
    if (typeof maybe.message === "string") {
      const match = maybe.message.match(/auth\/[a-z0-9-]+/i)
      if (match) return match[0]
    }
  }
  return "unknown"
}

/**
 * Extract the RAW, unmapped error details straight off the thrown error so our
 * logs always capture the true underlying reason (e.g. "auth/invalid-phone-number"),
 * even when we couldn't map it to a friendly message and `code` ends up "unknown".
 */
export function rawAuthErrorInfo(err: unknown): {
  rawCode: string
  rawMessage: string
} {
  if (err instanceof AuthTimeoutError) {
    return { rawCode: err.code, rawMessage: err.message }
  }
  if (typeof err === "object" && err !== null) {
    const maybe = err as { code?: unknown; message?: unknown }
    return {
      rawCode: typeof maybe.code === "string" ? maybe.code : "",
      rawMessage: typeof maybe.message === "string" ? maybe.message : "",
    }
  }
  if (typeof err === "string") return { rawCode: "", rawMessage: err }
  return { rawCode: "", rawMessage: "" }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  timeout:
    "This is taking longer than expected. Please tap Retry to request your code again.",
  "auth/invalid-phone-number":
    "That phone number doesn't look right. Please go back and check it.",
  "auth/missing-phone-number": "Please enter your phone number and try again.",
  "auth/quota-exceeded":
    "We're getting a lot of requests right now. Please try again in a few minutes.",
  "auth/too-many-requests":
    "Too many attempts from this device. Please wait a little while, then tap Retry.",
  "auth/captcha-check-failed":
    "The reCAPTCHA check didn't pass. Please complete it and tap Retry.",
  "auth/invalid-app-credential":
    "The verification check expired. Please tap Retry to start again.",
  "auth/network-request-failed":
    "Network problem — check your connection and tap Retry.",
  "auth/invalid-verification-code":
    "That code isn't correct. Please re-check the 6 digits and try again.",
  "auth/code-expired": "That code has expired. Tap Resend to get a new one.",
  "auth/missing-verification-code": "Please enter the 6-digit code we sent you.",
  "auth/session-expired": "Your code expired. Tap Resend to get a new one.",
  "auth/user-disabled": "This number has been disabled. Please contact support.",
}

/** Map any thrown auth error into a stable code + friendly, actionable message. */
export function friendlyAuthErrorMessage(err: unknown): {
  code: string
  message: string
} {
  const code = extractCode(err)
  const message =
    FRIENDLY_MESSAGES[code] ??
    "Something went wrong during verification. Please try again."
  return { code, message }
}

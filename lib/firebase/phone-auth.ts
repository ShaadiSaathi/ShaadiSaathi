"use client"

import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth"
import { getFirebaseAuth, isFirebaseConfigured } from "./config"

let confirmationResult: ConfirmationResult | null = null
let recaptchaVerifier: RecaptchaVerifier | null = null
// Track the exact DOM node the verifier was rendered into. React can unmount /
// swap that node (e.g. when the OTP gate switches views), which leaves a stale
// verifier pointing at a removed element and triggers Firebase's
// "reCAPTCHA client element has been removed" error on the next render/verify.
let recaptchaContainerEl: HTMLElement | null = null
let sendInFlight = false
let captchaSolved: Promise<void> | null = null
let resolveCaptchaSolved: (() => void) | null = null
let recaptchaRendered = false

/**
 * Ensure the number is E.164 before handing it to Firebase. The international
 * phone input already emits E.164 (e.g. "+923001234567"), so this is normally a
 * no-op; the fallback only guards any legacy value that arrives without a "+"
 * (treated as a Pakistani national number for backwards compatibility).
 */
function toE164(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith("+")) return trimmed
  const digits = trimmed.replace(/\D/g, "")
  return `+92${digits.slice(-10)}`
}

function resetCaptchaGate(): void {
  captchaSolved = new Promise<void>((resolve) => {
    resolveCaptchaSolved = resolve
  })
}

async function ensureRecaptchaRendered(
  verifier: RecaptchaVerifier
): Promise<void> {
  if (recaptchaRendered) return
  await verifier.render()
  recaptchaRendered = true
}

/** Tear down only the reCAPTCHA widget/verifier (keeps any pending SMS session). */
export function clearRecaptcha(): void {
  // Never tear down mid-send — that produces "reCAPTCHA client element has
  // been removed" and aborts a live identitytoolkit request.
  if (sendInFlight) return
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // ignore
    }
    recaptchaVerifier = null
  }
  recaptchaContainerEl = null
  captchaSolved = null
  resolveCaptchaSolved = null
  recaptchaRendered = false
}

export function clearPhoneAuthSession(): void {
  confirmationResult = null
  sendInFlight = false
  clearRecaptcha()
}

function getRecaptchaVerifier(containerId = "recaptcha-container"): RecaptchaVerifier {
  const auth = getFirebaseAuth()
  const el =
    typeof document !== "undefined" ? document.getElementById(containerId) : null

  if (
    recaptchaVerifier &&
    recaptchaContainerEl &&
    recaptchaContainerEl === el &&
    el.isConnected
  ) {
    return recaptchaVerifier
  }

  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // ignore
    }
    recaptchaVerifier = null
    recaptchaContainerEl = null
  }

  if (!el) {
    throw new Error("Verification isn't ready yet. Please tap Retry.")
  }

  resetCaptchaGate()

  // Visible checkbox — must stay in layout. Invisible + hidden containers fail
  // silently when Google requires a challenge.
  recaptchaVerifier = new RecaptchaVerifier(auth, el, {
    size: "normal",
    callback: () => {
      resolveCaptchaSolved?.()
    },
    "expired-callback": () => {
      resetCaptchaGate()
    },
  })
  recaptchaContainerEl = el
  return recaptchaVerifier
}

/**
 * Render the visible reCAPTCHA and wait until the user completes it.
 * Intentionally NOT wrapped in the OTP send timeout — users need time to
 * solve the challenge without getting a false "timeout" error.
 */
export async function waitForRecaptcha(
  containerId = "recaptcha-container"
): Promise<void> {
  if (!isFirebaseConfigured()) return
  const verifier = getRecaptchaVerifier(containerId)
  await ensureRecaptchaRendered(verifier)
  if (!captchaSolved) resetCaptchaGate()
  await captchaSolved
}

/**
 * Request a real Firebase phone OTP AFTER reCAPTCHA is solved.
 * Resolves ONLY after `signInWithPhoneNumber` returns a ConfirmationResult
 * with a non-empty verificationId. That means Firebase Auth accepted the
 * request — not that the carrier has delivered SMS (and Firebase test numbers
 * never send SMS at all).
 */
export async function sendPhoneOtp(
  phone: string,
  containerId = "recaptcha-container"
): Promise<{ verificationId: string }> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }
  const auth = getFirebaseAuth()
  // Ensure verifier exists (waitForRecaptcha normally ran first).
  const verifier = getRecaptchaVerifier(containerId)
  await ensureRecaptchaRendered(verifier)
  if (captchaSolved) {
    await captchaSolved
  }

  sendInFlight = true
  try {
    const result = await signInWithPhoneNumber(auth, toE164(phone), verifier)
    const verificationId =
      typeof result?.verificationId === "string" ? result.verificationId.trim() : ""
    if (!verificationId) {
      confirmationResult = null
      throw new Error(
        "Firebase accepted the request but did not return a verification ID. Please try again."
      )
    }
    confirmationResult = result
    return { verificationId }
  } finally {
    sendInFlight = false
  }
}

export async function confirmPhoneOtp(code: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }
  if (!confirmationResult) {
    throw new Error("No verification in progress. Request a new code.")
  }
  await confirmationResult.confirm(code)
  confirmationResult = null
}

export function hasPendingPhoneVerification(): boolean {
  return confirmationResult !== null
}

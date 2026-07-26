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
// Remembering the node lets us detect that and rebuild the verifier.
let recaptchaContainerEl: HTMLElement | null = null
/** True after the visible reCAPTCHA checkbox is solved for the current verifier. */
let recaptchaSolved = false
let onRecaptchaSolvedListener: (() => void) | null = null
/** True while render/signInWithPhoneNumber is in progress — blocks teardown. */
let sendInFlight = false

export function setRecaptchaSolvedListener(listener: (() => void) | null): void {
  onRecaptchaSolvedListener = listener
}

export function wasRecaptchaSolved(): boolean {
  return recaptchaSolved
}

export function isPhoneOtpSendInFlight(): boolean {
  return sendInFlight
}

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

/** Tear down only the reCAPTCHA widget/verifier (keeps any pending SMS session). */
export function clearRecaptcha(options?: { force?: boolean }): void {
  // Never destroy the widget mid-send — Soft-nav remounts / Strict Mode cleanup
  // used to clear the verifier while signInWithPhoneNumber was still waiting on
  // the checkbox, which surfaced as "reCAPTCHA client element has been removed".
  // Explicit Retry/reset passes force:true so a stuck attempt can start fresh.
  if (sendInFlight && !options?.force) return
  sendInFlight = false
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // ignore
    }
    recaptchaVerifier = null
  }
  recaptchaContainerEl = null
  recaptchaSolved = false
}

/**
 * Resolve once the visible reCAPTCHA checkbox has been solved (or already is).
 * No hard timeout — the UI stays on "awaiting captcha" until the user acts.
 */
export function waitForRecaptchaSolved(): Promise<void> {
  if (recaptchaSolved) {
    onRecaptchaSolvedListener?.()
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const previous = onRecaptchaSolvedListener
    onRecaptchaSolvedListener = () => {
      previous?.()
      resolve()
    }
  })
}

export function clearPhoneAuthSession(): void {
  confirmationResult = null
  clearRecaptcha({ force: true })
}

function getRecaptchaVerifier(containerId = "recaptcha-container"): RecaptchaVerifier {
  const auth = getFirebaseAuth()
  const el =
    typeof document !== "undefined" ? document.getElementById(containerId) : null

  // Reuse the existing verifier ONLY if it's still bound to the same, live DOM
  // node. If React swapped or removed that node, the old verifier is stale and
  // would throw "reCAPTCHA client element has been removed" — so rebuild it
  // against the current node instead.
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

  recaptchaSolved = false
  // Use a visible ("normal") reCAPTCHA checkbox. The container element must be
  // visible in the layout so the user can actually complete the challenge —
  // an invisible verifier inside a hidden container silently fails when Google
  // decides a challenge is required, producing a 400 on sendVerificationCode.
  recaptchaVerifier = new RecaptchaVerifier(auth, el, {
    size: "normal",
    callback: () => {
      recaptchaSolved = true
      onRecaptchaSolvedListener?.()
    },
    "expired-callback": () => {
      recaptchaSolved = false
    },
  })
  recaptchaContainerEl = el
  return recaptchaVerifier
}

/** Render the visible reCAPTCHA widget so the user can solve it before we send the code. */
export async function renderRecaptcha(containerId = "recaptcha-container"): Promise<void> {
  if (!isFirebaseConfigured()) return
  const verifier = getRecaptchaVerifier(containerId)
  await verifier.render()
}

/**
 * Show the visible reCAPTCHA and wait until the checkbox is solved.
 * Call this *before* applying a send timeout so users aren't timed out
 * while still ticking “I'm not a robot”.
 */
export async function preparePhoneOtpCaptcha(
  containerId = "recaptcha-container"
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }
  sendInFlight = true
  try {
    const verifier = getRecaptchaVerifier(containerId)
    await verifier.render()
    await waitForRecaptchaSolved()
  } catch (err) {
    sendInFlight = false
    throw err
  }
}

/**
 * Request a real Firebase phone OTP. Resolves ONLY after
 * `signInWithPhoneNumber` successfully returns a ConfirmationResult that
 * includes a non-empty verificationId. A resolve here means Firebase Auth
 * accepted the request — it does NOT by itself guarantee carrier SMS delivery
 * (and Firebase test numbers never send SMS at all).
 *
 * Prefer `preparePhoneOtpCaptcha()` first so any timeout only covers SMS send.
 *
 * @returns The verificationId from the ConfirmationResult (for success logging).
 */
export async function sendPhoneOtp(
  phone: string,
  containerId = "recaptcha-container"
): Promise<{ verificationId: string }> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }
  sendInFlight = true
  try {
    const auth = getFirebaseAuth()
    const verifier = getRecaptchaVerifier(containerId)
    await verifier.render()
    if (!recaptchaSolved) {
      await waitForRecaptchaSolved()
    }
    const result = await signInWithPhoneNumber(auth, toE164(phone), verifier)
    const verificationId =
      typeof result?.verificationId === "string" ? result.verificationId.trim() : ""
    if (!verificationId) {
      // Defensive: Firebase should always return a verificationId on success.
      // Treat a missing one as a hard failure so the UI never shows a false "sent".
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

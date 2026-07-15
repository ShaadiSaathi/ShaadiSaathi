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
export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // ignore
    }
    recaptchaVerifier = null
  }
  recaptchaContainerEl = null
}

export function clearPhoneAuthSession(): void {
  confirmationResult = null
  clearRecaptcha()
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

  // Use a visible ("normal") reCAPTCHA checkbox. The container element must be
  // visible in the layout so the user can actually complete the challenge —
  // an invisible verifier inside a hidden container silently fails when Google
  // decides a challenge is required, producing a 400 on sendVerificationCode.
  recaptchaVerifier = new RecaptchaVerifier(auth, el, {
    size: "normal",
    callback: () => {},
    "expired-callback": () => {},
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

export async function sendPhoneOtp(
  phone: string,
  containerId = "recaptcha-container"
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured")
  }
  const auth = getFirebaseAuth()
  const verifier = getRecaptchaVerifier(containerId)
  await verifier.render()
  confirmationResult = await signInWithPhoneNumber(auth, toE164(phone), verifier)
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

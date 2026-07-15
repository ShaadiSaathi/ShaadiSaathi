"use client"

import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth"
import { getFirebaseAuth, isFirebaseConfigured } from "./config"

let confirmationResult: ConfirmationResult | null = null
let recaptchaVerifier: RecaptchaVerifier | null = null

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

export function clearPhoneAuthSession(): void {
  confirmationResult = null
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // ignore
    }
    recaptchaVerifier = null
  }
}

function getRecaptchaVerifier(containerId = "recaptcha-container"): RecaptchaVerifier {
  const auth = getFirebaseAuth()
  if (recaptchaVerifier) return recaptchaVerifier

  // Use a visible ("normal") reCAPTCHA checkbox. The container element must be
  // visible in the layout so the user can actually complete the challenge —
  // an invisible verifier inside a hidden container silently fails when Google
  // decides a challenge is required, producing a 400 on sendVerificationCode.
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "normal",
    callback: () => {},
    "expired-callback": () => {},
  })
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

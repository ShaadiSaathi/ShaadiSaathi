"use client"

import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth"
import { getFirebaseAuth, isFirebaseConfigured } from "./config"

let confirmationResult: ConfirmationResult | null = null
let recaptchaVerifier: RecaptchaVerifier | null = null

function formatE164Pakistan(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10)
  return `+92${digits}`
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
  confirmationResult = await signInWithPhoneNumber(auth, formatE164Pakistan(phone), verifier)
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
